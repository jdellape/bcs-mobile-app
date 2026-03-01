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

const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.trim().replace(/\/$/, "");

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

function SearchScreen({ services, selectedService, setSelectedService }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(
          `/agencies/by-service/${encodeURIComponent(selectedService)}`
        )
      );
      setAgencies(await res.json());
    } catch (e) {
      console.error("Error fetching agencies:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderAgency = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text>{item.address_line_one}</Text>
      <Text>{item.phone_num}</Text>
      <Text style={styles.cardDescription}>{item.services_description}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heading}>Find Services</Text>

      <Picker
        selectedValue={selectedService}
        onValueChange={setSelectedService}
        style={styles.picker}
      >
        {services.map((s) => (
          <Picker.Item key={s} label={s} value={s} />
        ))}
      </Picker>

      <Button title="Search" onPress={fetchAgencies} />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      <FlatList
        data={agencies}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderAgency}
        style={{ marginTop: 20 }}
      />
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
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.heading}>Manage Agency</Text>

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
        value={form.name}
        onChangeText={(v) => updateField("name", v)}
        editable={mode === "add"}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={form.address_line_one}
        onChangeText={(v) => updateField("address_line_one", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        value={form.city}
        onChangeText={(v) => updateField("city", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Zip Code"
        value={form.zip_code}
        onChangeText={(v) => updateField("zip_code", v)}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={form.phone_num}
        onChangeText={(v) => updateField("phone_num", v)}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionTitle}>Optional</Text>
      <TextInput
        style={styles.input}
        placeholder="Contact Name"
        value={form.contact_name}
        onChangeText={(v) => updateField("contact_name", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
        placeholder="Description of Services"
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
  const [selectedService, setSelectedService] = useState("");

  const loadServices = async () => {
    try {
      const res = await fetch(buildApiUrl("/services"));
      const data = await res.json();
      setServices(data);
      if (data.length > 0) setSelectedService(data[0]);
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
      {/* Screen toggle */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, screen === "search" && styles.navBtnActive]}
          onPress={() => setScreen("search")}
        >
          <Text style={[styles.navText, screen === "search" && styles.navTextActive]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, screen === "manage" && styles.navBtnActive]}
          onPress={() => setScreen("manage")}
        >
          <Text style={[styles.navText, screen === "manage" && styles.navTextActive]}>
            Manage Agency
          </Text>
        </TouchableOpacity>
      </View>

      {screen === "search" ? (
        <SearchScreen
          services={services}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
        />
      ) : (
        <ManageScreen
          services={services}
          agencyNames={agencyNames}
          onSaved={handleSaved}
        />
      )}
    </View>
  );
}

// --------------- Styles ---------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
  },

  navRow: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  navBtnActive: {
    backgroundColor: "#2196F3",
  },
  navText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2196F3",
  },
  navTextActive: {
    color: "#fff",
  },

  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  picker: {
    marginBottom: 10,
  },

  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  cardName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  cardDescription: {
    marginTop: 6,
    fontStyle: "italic",
    color: "#555",
  },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 14,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#888",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  toggleBtnActive: {
    backgroundColor: "#444",
  },
  toggleText: {
    fontSize: 14,
    color: "#444",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
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
    borderColor: "#888",
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
  },
});
