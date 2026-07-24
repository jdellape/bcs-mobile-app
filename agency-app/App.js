import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.trim().replace(/\/$/, "");

/** Palette aligned with Streamlit default dark theme. */
const theme = {
  colors: {
    accent: "#FF4B4B",
    accentSoft: "#FF6B6B",
    appBackground: "#0E1117",
    surfacePrimary: "#262730",
    surfaceSecondary: "#262730",
    surfaceActive: "#31333F",
    border: "#464B5D",
    textPrimary: "#FAFAFA",
    textPrimaryStrong: "#FFFFFF",
    textSecondary: "#C4C8D4",
    textBody: "#D7DADC",
    textMuted: "#808495",
    textOnAccent: "#FFFFFF",
    inputPlaceholder: "#808495",
    danger: "#FF6B6B",
  },
  fonts: {
    caption: 14,
    body: 17,
    bodyLarge: 18,
    title: 20,
    screenTitle: 26,
  },
};

const buildApiUrl = (path) => {
  if (!API_BASE) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_BASE. Add it to your .env (see .env.example)."
    );
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const EMPTY_FORM = {
  name: "",
  address_line_one: "",
  city: "",
  zip_code: "",
  phone_num: "",
  contact_name: "",
  email: "",
  services_description: "",
};

// --------------- Search Screen ---------------

function AgencySearchCard({ item }) {
  const [showDescription, setShowDescription] = useState(false);
  const description = (item.services_description || "").trim();
  const agencyKey = item.id || item.name || "";

  useEffect(() => {
    setShowDescription(false);
  }, [agencyKey]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardDetail}>{item.address_line_one}</Text>
      <Text style={styles.cardDetail}>{item.phone_num}</Text>
      {!!description && (
        <>
          {showDescription && (
            <Text style={styles.cardDescription}>{description}</Text>
          )}
          <TouchableOpacity
            onPress={() => setShowDescription((prev) => !prev)}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.cardMoreBtn}>
              {showDescription ? "See Less" : "See More Information"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function SearchScreen({ services }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const agencyListRef = useRef(null);

  useLayoutEffect(() => {
    if (selectedService) {
      agencyListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedService]);

  useEffect(() => {
    if (!selectedService) {
      setAgencies([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          buildApiUrl(
            `/agencies/by-service/${encodeURIComponent(selectedService)}`
          )
        );
        const data = res.ok ? await res.json() : [];
        if (!cancelled) {
          setAgencies(
            [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          );
        }
      } catch (e) {
        console.error("Error fetching agencies:", e);
        if (!cancelled) {
          Alert.alert("Network Error", "Could not load agencies for that service.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedService]);

  const renderAgency = ({ item }) => <AgencySearchCard item={item} />;

  const renderServicePicker = () => (
    <>
      <Text style={styles.heading}>Find Services</Text>
      <Text style={styles.servicePickerLabel}>Service</Text>
      <View style={styles.servicePickerWrap}>
        <Picker
          selectedValue={selectedService}
          onValueChange={setSelectedService}
          style={styles.servicePicker}
          dropdownIconColor={theme.colors.accent}
          itemStyle={styles.servicePickerItem}
        >
          <Picker.Item label="Select a service…" value="" />
          {services.map((svc) => (
            <Picker.Item key={svc} label={svc} value={svc} />
          ))}
        </Picker>
      </View>
    </>
  );

  const searchHeader = (
    <View style={styles.searchListHeader}>
      {renderServicePicker()}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsHeading}>Agencies ({agencies.length})</Text>
        {loading && (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.searchContainer}>
      {!selectedService ? (
        <>
          {renderServicePicker()}
          <Text style={styles.resultsHint}>
            Choose a service above to see agencies that offer it.
          </Text>
        </>
      ) : (
        <FlatList
          ref={agencyListRef}
          data={agencies}
          keyExtractor={(item, i) => item.id || item.name || `agency-${i}`}
          renderItem={renderAgency}
          ListHeaderComponent={searchHeader}
          style={styles.resultsList}
          contentContainerStyle={
            agencies.length === 0
              ? styles.resultsListEmpty
              : styles.resultsListContent
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.resultsHint}>
                No agencies found for this service.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

// --------------- Manage Agency Screen ---------------

function ManageScreen({ services, agencyList, onSaved }) {
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedServices, setSelectedServices] = useState({});
  const [editAgencyId, setEditAgencyId] = useState("");
  const [agencyQuery, setAgencyQuery] = useState("");
  const [isAgencyPanelOpen, setIsAgencyPanelOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const normalizedAgencyQuery = (agencyQuery || "").trim().toLowerCase();
  const filteredAgencies = normalizedAgencyQuery
    ? agencyList.filter((a) =>
        (a.name || "").toLowerCase().includes(normalizedAgencyQuery)
      )
    : agencyList;

  const selectedAgencyLabel =
    agencyList.find((a) => a.id === editAgencyId)?.name || "";

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleService = (svc) =>
    setSelectedServices((prev) => ({ ...prev, [svc]: !prev[svc] }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setSelectedServices({});
    setEditAgencyId("");
    setAgencyQuery("");
  };

  const loadAgencyForEdit = async (agencyId) => {
    if (!agencyId) return resetForm();
    setEditAgencyId(agencyId);
    try {
      const res = await fetch(
        buildApiUrl(`/agencies/${encodeURIComponent(agencyId)}`)
      );
      const data = await res.json();
      setForm({
        name: data.name || "",
        address_line_one: data.address_line_one || "",
        city: data.city || "",
        zip_code: data.zip_code || "",
        phone_num: data.phone_num || "",
        contact_name: data.contact_name || "",
        email: data.email || "",
        services_description: data.services_description || "",
      });
      const svcMap = {};
      if (data.services) {
        Object.keys(data.services).forEach((s) => (svcMap[s] = true));
      }
      setSelectedServices(svcMap);
    } catch (e) {
      console.error("Error loading agency:", e);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.address_line_one || !form.phone_num) {
      Alert.alert("Missing Fields", "Name, address, and phone are required.");
      return;
    }

    const checkedServices = Object.keys(selectedServices).filter(
      (s) => selectedServices[s]
    );

    const payload = { ...form, services: checkedServices };
    setSubmitting(true);

    try {
      const isEdit = mode === "edit";
      const url = isEdit
        ? buildApiUrl(`/agencies/${encodeURIComponent(editAgencyId)}`)
        : buildApiUrl("/agencies");
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", err.detail || "Something went wrong");
        return;
      }

      Alert.alert("Success", isEdit ? "Agency updated!" : "Agency created!");
      resetForm();
      onSaved();
    } catch (e) {
      Alert.alert("Network Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgency = () => {
    if (!editAgencyId) {
      Alert.alert("Select Agency", "Choose an agency to delete first.");
      return;
    }

    Alert.alert(
      "Delete Agency",
      `Are you sure you want to permanently delete "${form.name || selectedAgencyLabel}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await fetch(
                buildApiUrl(`/agencies/${encodeURIComponent(editAgencyId)}`),
                { method: "DELETE" }
              );

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                Alert.alert("Error", err.detail || "Failed to delete agency");
                return;
              }

              Alert.alert("Success", "Agency deleted!");
              resetForm();
              onSaved();
            } catch (e) {
              Alert.alert("Network Error", e.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleAgencySelection = (agencyId) => {
    if (!agencyId) return;

    if (agencyId === editAgencyId) {
      resetForm();
      return;
    }

    setAgencyQuery("");
    loadAgencyForEdit(agencyId);
    setIsAgencyPanelOpen(false);
  };

  const showFullAgencySelection = mode === "edit" && !editAgencyId;

  return (
    <ScrollView
      style={styles.manageContainer}
      contentContainerStyle={showFullAgencySelection ? styles.manageContainerExpanded : undefined}
    >
      <Text style={styles.heading}>Manage Agencies</Text>

      {/* Add / Edit toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === "add" && styles.toggleBtnActive]}
          onPress={() => { setMode("add"); resetForm(); }}
        >
          <Text style={[styles.toggleText, mode === "add" && styles.toggleTextActive]}>
            Add New
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === "edit" && styles.toggleBtnActive]}
          onPress={() => { setMode("edit"); resetForm(); }}
        >
          <Text style={[styles.toggleText, mode === "edit" && styles.toggleTextActive]}>
            Edit Existing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Agency selector for edit mode */}
      {mode === "edit" && (
        <View style={styles.agencySelectorWrap}>
          <TouchableOpacity
            style={styles.servicesToggleBtn}
            onPress={() => setIsAgencyPanelOpen((prev) => !prev)}
          >
            <Text style={styles.servicesToggleText}>Available Agencies</Text>
            <Ionicons
              name={isAgencyPanelOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.accent}
            />
          </TouchableOpacity>

          {!isAgencyPanelOpen && !!editAgencyId && (
            <Text style={styles.activeServicesCollapsedText}>
              {selectedAgencyLabel}
            </Text>
          )}

          {isAgencyPanelOpen && (
            <View
              style={[
                styles.agencyPanel,
                showFullAgencySelection && styles.agencyPanelExpanded,
              ]}
            >
              <TextInput
                style={styles.serviceFilterInput}
                placeholder="Filter agencies"
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={agencyQuery}
                onChangeText={setAgencyQuery}
              />

              <View style={styles.searchMetaRow}>
                <Text style={styles.searchMetaLabel}>
                  {editAgencyId ? "1 agency selected" : "No agency selected"}
                </Text>
                {!!editAgencyId && (
                  <TouchableOpacity onPress={resetForm}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={[
                  styles.agencyList,
                  showFullAgencySelection && styles.agencyListExpanded,
                ]}
                nestedScrollEnabled
              >
                {filteredAgencies.map((a) => {
                  const active = a.id === editAgencyId;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.serviceRow, active && styles.serviceRowActive]}
                      onPress={() => handleAgencySelection(a.id)}
                    >
                      <Text
                        style={[
                          styles.serviceRowText,
                          active && styles.serviceRowTextActive,
                        ]}
                      >
                        {a.name}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {(mode === "add" || !!editAgencyId) ? (
        <>
          {/* Form fields */}
          <Text style={styles.sectionTitle}>Required</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.name}
            onChangeText={(v) => updateField("name", v)}
            editable={mode === "add"}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.address_line_one}
            onChangeText={(v) => updateField("address_line_one", v)}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.city}
            onChangeText={(v) => updateField("city", v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Zip Code"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.zip_code}
            onChangeText={(v) => updateField("zip_code", v)}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.phone_num}
            onChangeText={(v) => updateField("phone_num", v)}
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionTitle}>Optional</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact Name"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.contact_name}
            onChangeText={(v) => updateField("contact_name", v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.email}
            onChangeText={(v) => updateField("email", v)}
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder="Description of Services"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={form.services_description}
            onChangeText={(v) => updateField("services_description", v)}
            multiline
          />

          {/* Service checkboxes */}
          <Text style={styles.sectionTitle}>Services Provided</Text>
          {services.map((svc) => (
            <TouchableOpacity
              key={svc}
              style={styles.checkboxRow}
              onPress={() => toggleService(svc)}
            >
              <View style={[styles.checkbox, selectedServices[svc] && styles.checkboxChecked]}>
                {selectedServices[svc] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>{svc}</Text>
            </TouchableOpacity>
          ))}

          {/* Submit */}
          <View style={{ marginTop: 20, marginBottom: 40 }}>
            {submitting ? (
              <ActivityIndicator size="large" />
            ) : (
              <Button
                title={mode === "add" ? "Submit New Agency" : "Update Agency"}
                onPress={handleSubmit}
              />
            )}

            {mode === "edit" && (
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  (!editAgencyId || submitting) && styles.deleteBtnDisabled,
                ]}
                onPress={handleDeleteAgency}
                disabled={!editAgencyId || submitting}
              >
                <Text style={styles.deleteBtnText}>Delete Agency</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <Text style={styles.resultsHint}>
          Select an agency above to load its details for editing.
        </Text>
      )}
    </ScrollView>
  );
}

// --------------- Root App ---------------

export default function App() {
  const [screen, setScreen] = useState("search");
  const [services, setServices] = useState([]);
  const [agencyList, setAgencyList] = useState([]);

  const loadServices = async () => {
    try {
      const res = await fetch(buildApiUrl("/services"));
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error("Error fetching services:", e);
    }
  };

  const loadAgencyList = async () => {
    try {
      const res = await fetch(buildApiUrl("/agencies"));
      const data = await res.json();
      setAgencyList(
        data
          .map((a) => ({ id: a.id, name: a.name }))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      );
    } catch (e) {
      console.error("Error fetching agency list:", e);
    }
  };

  useEffect(() => {
    loadServices();
    loadAgencyList();
  }, []);

  const handleSaved = () => {
    loadServices();
    loadAgencyList();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.contentArea}>
        {screen === "search" ? (
          <SearchScreen services={services} />
        ) : (
          <ManageScreen
            services={services}
            agencyList={agencyList}
            onSaved={handleSaved}
          />
        )}
      </View>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.bottomTabBtn}
          onPress={() => setScreen("search")}
        >
          <Ionicons
            name={screen === "search" ? "search" : "search-outline"}
            size={22}
            color={
              screen === "search"
                ? theme.colors.accent
                : theme.colors.textMuted
            }
          />
          <Text
            style={[
              styles.bottomTabText,
              screen === "search" && styles.bottomTabTextActive,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabBtn}
          onPress={() => setScreen("manage")}
        >
          <MaterialCommunityIcons
            name={screen === "manage" ? "pencil-plus" : "pencil-plus-outline"}
            size={22}
            color={
              screen === "manage"
                ? theme.colors.accent
                : theme.colors.textMuted
            }
          />
          <Text
            style={[
              styles.bottomTabText,
              screen === "manage" && styles.bottomTabTextActive,
            ]}
          >
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --------------- Styles ---------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
    backgroundColor: theme.colors.appBackground,
  },
  contentArea: {
    flex: 1,
  },
  manageContainer: {
    flex: 1,
  },
  manageContainerExpanded: {
    flexGrow: 1,
  },
  bottomTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingBottom: 6,
    marginTop: 8,
    backgroundColor: theme.colors.surfacePrimary,
  },
  bottomTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
  },
  bottomTabText: {
    fontSize: theme.fonts.caption,
    marginTop: 2,
    color: theme.colors.textMuted,
  },
  bottomTabTextActive: {
    color: theme.colors.accentSoft,
    fontWeight: "600",
  },

  heading: {
    fontSize: theme.fonts.screenTitle,
    fontWeight: "bold",
    marginBottom: 12,
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    flex: 1,
  },
  searchListHeader: {
    marginBottom: 4,
  },
  agencySelectorWrap: {
    marginBottom: 10,
  },
  agencyPanel: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    backgroundColor: theme.colors.surfacePrimary,
    maxHeight: 320,
  },
  agencyPanelExpanded: {
    flex: 1,
    maxHeight: undefined,
  },
  agencyList: {
    maxHeight: 240,
  },
  agencyListExpanded: {
    flex: 1,
    maxHeight: undefined,
  },
  servicesToggleBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfacePrimary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  servicesToggleText: {
    fontSize: theme.fonts.bodyLarge,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  activeServicesCollapsedText: {
    fontSize: theme.fonts.caption,
    color: theme.colors.textMuted,
    marginTop: -2,
    marginBottom: 8,
  },
  servicePickerLabel: {
    fontSize: theme.fonts.body,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  servicePickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: "hidden",
  },
  servicePicker: {
    color: theme.colors.textPrimary,
  },
  servicePickerItem: {
    color: theme.colors.textPrimary,
    fontSize: theme.fonts.bodyLarge,
  },
  serviceFilterInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: theme.fonts.bodyLarge,
    marginBottom: 12,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  searchMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 8,
  },
  searchMetaLabel: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  clearText: {
    fontSize: theme.fonts.body,
    color: theme.colors.accentSoft,
    fontWeight: "600",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  serviceRowActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.surfaceActive,
  },
  serviceRowText: {
    fontSize: theme.fonts.bodyLarge,
    color: theme.colors.textPrimary,
  },
  serviceRowTextActive: {
    color: theme.colors.textPrimaryStrong,
    fontWeight: "600",
  },
  resultsSection: {
    flex: 1,
    minHeight: 0,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resultsHeading: {
    fontSize: theme.fonts.title,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  resultsHint: {
    fontSize: theme.fonts.body,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 8,
  },
  resultsListEmpty: {
    flexGrow: 1,
    paddingTop: 4,
  },

  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: theme.colors.surfacePrimary,
  },
  cardName: {
    fontWeight: "bold",
    fontSize: theme.fonts.title,
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  cardDetail: {
    fontSize: theme.fonts.body,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  cardDescription: {
    marginTop: 8,
    fontSize: theme.fonts.body,
    lineHeight: 24,
    fontStyle: "italic",
    color: theme.colors.textBody,
  },
  cardMoreBtn: {
    marginTop: 10,
    fontSize: theme.fonts.body,
    color: theme.colors.accentSoft,
    fontWeight: "600",
  },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 14,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  toggleText: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.textOnAccent,
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: theme.fonts.bodyLarge,
    marginBottom: 10,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkmark: {
    color: theme.colors.textOnAccent,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
  },
  deleteBtn: {
    marginTop: 12,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: theme.colors.danger,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    color: theme.colors.textOnAccent,
    fontWeight: "700",
    fontSize: theme.fonts.bodyLarge,
  },
});
