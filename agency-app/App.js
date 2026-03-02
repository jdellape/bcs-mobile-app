import React, { useState, useEffect } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.trim().replace(/\/$/, "");
const theme = {
  colors: {
    accent: "#38bdf8",
    accentSoft: "#7dd3fc",
    appBackground: "#2a2f36",
    surfacePrimary: "#353b44",
    surfaceSecondary: "#3f4650",
    surfaceActive: "#4b5968",
    border: "#5b6472",
    textPrimary: "#f1f5f9",
    textPrimaryStrong: "#f8fdff",
    textSecondary: "#dbe4ee",
    textMuted: "#cbd5e1",
    textOnAccent: "#0f172a",
    inputPlaceholder: "#cbd5e1",
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

function SearchScreen({ services }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [isServicePanelOpen, setIsServicePanelOpen] = useState(true);
  const [selectedServices, setSelectedServices] = useState({});

  const normalizedQuery = (serviceQuery || "").trim().toLowerCase();
  const filteredServices = normalizedQuery
    ? services.filter((svc) => svc.toLowerCase().includes(normalizedQuery))
    : services;
  const activeServices = Object.keys(selectedServices).filter(
    (svc) => selectedServices[svc]
  );
  const hasActiveServices = activeServices.length > 0;

  const toggleService = (serviceName) => {
    setSelectedServices((prev) => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  const clearSelection = () => {
    setSelectedServices({});
    setServiceQuery("");
    setAgencies([]);
  };

  const fetchAgencies = async () => {
    if (activeServices.length === 0) {
      setAgencies([]);
      return;
    }

    setLoading(true);
    try {
      const responses = await Promise.all(
        activeServices.map((serviceName) =>
          fetch(
            buildApiUrl(`/agencies/by-service/${encodeURIComponent(serviceName)}`)
          ).then((res) => (res.ok ? res.json() : []))
        )
      );

      const mergedAgencies = new Map();
      responses.forEach((agencyList, idx) => {
        const sourceService = activeServices[idx];
        agencyList.forEach((agency) => {
          const key = agency.name || `${agency.address_line_one}-${agency.phone_num}`;
          if (!mergedAgencies.has(key)) {
            mergedAgencies.set(key, { ...agency, matched_services: [sourceService] });
            return;
          }
          const existing = mergedAgencies.get(key);
          if (!existing.matched_services.includes(sourceService)) {
            existing.matched_services.push(sourceService);
          }
        });
      });

      setAgencies(
        Array.from(mergedAgencies.values()).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        )
      );
    } catch (e) {
      console.error("Error fetching agencies:", e);
      Alert.alert("Network Error", "Could not load agencies for selected services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, [selectedServices]);

  const renderAgency = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardDetail}>{item.address_line_one}</Text>
      <Text style={styles.cardDetail}>{item.phone_num}</Text>
      <Text style={styles.cardDescription}>{item.services_description}</Text>
      {!!item.matched_services?.length && (
        <Text style={styles.cardMeta}>
          Matches: {item.matched_services.join(", ")}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.searchContainer}>
      <Text style={styles.heading}>Find Services</Text>

      <TouchableOpacity
        style={styles.servicesToggleBtn}
        onPress={() => setIsServicePanelOpen((prev) => !prev)}
      >
        <Text style={styles.servicesToggleText}>Available Services</Text>
        <Ionicons
          name={isServicePanelOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.accent}
        />
      </TouchableOpacity>

      {!isServicePanelOpen && hasActiveServices && (
        <Text style={styles.activeServicesCollapsedText}>
          {activeServices.join(", ")}
        </Text>
      )}

      {isServicePanelOpen && (
        <View
          style={[
            styles.servicesPanel,
            !hasActiveServices && styles.servicesPanelExpanded,
            hasActiveServices && styles.servicesPanelCompact,
          ]}
        >
          <TextInput
            style={styles.serviceFilterInput}
            placeholder="Filter services"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={serviceQuery}
            onChangeText={setServiceQuery}
          />

          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaLabel}>
              {activeServices.length} service{activeServices.length === 1 ? "" : "s"} selected
            </Text>
            {activeServices.length > 0 && (
              <TouchableOpacity onPress={clearSelection}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={[
              styles.servicesList,
              !hasActiveServices && styles.servicesListExpanded,
              hasActiveServices && styles.servicesListCompact,
            ]}
            nestedScrollEnabled
          >
            {filteredServices.map((svc) => {
              const active = !!selectedServices[svc];
              return (
                <TouchableOpacity
                  key={svc}
                  style={[styles.serviceRow, active && styles.serviceRowActive]}
                  onPress={() => toggleService(svc)}
                >
                  <Text
                    style={[
                      styles.serviceRowText,
                      active && styles.serviceRowTextActive,
                    ]}
                  >
                    {svc}
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

      {(hasActiveServices || !isServicePanelOpen) && (
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.resultsHeading}>Agencies ({agencies.length})</Text>
            {loading && <ActivityIndicator size="small" />}
          </View>

          {!hasActiveServices ? (
            <Text style={styles.resultsHint}>
              Open Available Services and select at least one service.
            </Text>
          ) : (
            <FlatList
              data={agencies}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderAgency}
              style={styles.resultsList}
              contentContainerStyle={{ paddingBottom: 8 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

// --------------- Manage Agency Screen ---------------

function ManageScreen({ services, agencyNames, onSaved }) {
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedServices, setSelectedServices] = useState({});
  const [editAgencyName, setEditAgencyName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleService = (svc) =>
    setSelectedServices((prev) => ({ ...prev, [svc]: !prev[svc] }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setSelectedServices({});
    setEditAgencyName("");
  };

  const loadAgencyForEdit = async (name) => {
    if (!name) return resetForm();
    setEditAgencyName(name);
    try {
      const res = await fetch(
        buildApiUrl(`/agencies/${encodeURIComponent(name)}`)
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
        ? buildApiUrl(`/agencies/${encodeURIComponent(editAgencyName)}`)
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

  return (
    <ScrollView style={styles.manageContainer}>
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

      {/* Agency picker for edit mode */}
      {mode === "edit" && (
        <Picker
          selectedValue={editAgencyName}
          onValueChange={loadAgencyForEdit}
          style={styles.picker}
        >
          <Picker.Item label="-- Select Agency --" value="" />
          {agencyNames.map((n) => (
            <Picker.Item key={n} label={n} value={n} />
          ))}
        </Picker>
      )}

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
      </View>
    </ScrollView>
  );
}

// --------------- Root App ---------------

export default function App() {
  const [screen, setScreen] = useState("search");
  const [services, setServices] = useState([]);
  const [agencyNames, setAgencyNames] = useState([]);

  const loadServices = async () => {
    try {
      const res = await fetch(buildApiUrl("/services"));
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error("Error fetching services:", e);
    }
  };

  const loadAgencyNames = async () => {
    try {
      const res = await fetch(buildApiUrl("/agencies"));
      const data = await res.json();
      setAgencyNames(data.map((a) => a.name).sort());
    } catch (e) {
      console.error("Error fetching agency names:", e);
    }
  };

  useEffect(() => {
    loadServices();
    loadAgencyNames();
  }, []);

  const handleSaved = () => {
    loadServices();
    loadAgencyNames();
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        {screen === "search" ? (
          <SearchScreen services={services} />
        ) : (
          <ManageScreen
            services={services}
            agencyNames={agencyNames}
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
            size={20}
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
            size={20}
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
    fontSize: 12,
    marginTop: 2,
    color: theme.colors.textMuted,
  },
  bottomTabTextActive: {
    color: theme.colors.accentSoft,
    fontWeight: "600",
  },

  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    flex: 1,
  },
  picker: {
    marginBottom: 10,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfacePrimary,
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
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  activeServicesCollapsedText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -2,
    marginBottom: 8,
  },
  servicesPanel: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surfacePrimary,
  },
  servicesPanelExpanded: {
    flex: 1,
  },
  servicesPanelCompact: {
    maxHeight: "48%",
  },
  serviceFilterInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
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
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.accentSoft,
    fontWeight: "600",
  },
  servicesList: {
    maxHeight: 300,
  },
  servicesListExpanded: {
    flex: 1,
    maxHeight: undefined,
  },
  servicesListCompact: {
    maxHeight: 260,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  resultsHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  resultsList: {
    flex: 1,
  },

  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  cardName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  cardDetail: {
    color: theme.colors.textSecondary,
  },
  cardDescription: {
    marginTop: 6,
    fontStyle: "italic",
    color: theme.colors.textMuted,
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.accentSoft,
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
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.textOnAccent,
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: 16,
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
    fontSize: 15,
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
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
