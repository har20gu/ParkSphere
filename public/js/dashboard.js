const filterInput = document.getElementById("clientFilter");
const table = document.getElementById("vehicleTable");
const exitForm = document.getElementById("exitForm");
const themeToggle = document.getElementById("themeToggle");
const entryForm = document.getElementById("entryForm");
const entryVehicleNumber = document.getElementById("entryVehicleNumber");
const entryOwnerName = document.getElementById("entryOwnerName");
const entryPhoneNumber = document.getElementById("entryPhoneNumber");
const entryHint = document.getElementById("entryHint");

const THEME_STORAGE_KEY = "vehicle-dashboard-theme";

const applyTheme = (theme) => {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  }
};

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

if (filterInput && table) {
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  filterInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    rows.forEach((row) => {
      const rowText = row.innerText.toLowerCase();
      row.style.display = rowText.includes(query) ? "" : "none";
    });
  });
}

if (exitForm) {
  exitForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(exitForm);
    const vehicleNumber = String(formData.get("vehicleNumber") || "").trim();

    if (!vehicleNumber) {
      alert("Please enter vehicle number.");
      return;
    }

    try {
      const response = await fetch("/api/vehicle/exit-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleNumber })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Unable to calculate parking fee.");
        return;
      }

      const confirmText =
        `Vehicle: ${data.vehicleNumber}\n` +
        `Owner: ${data.ownerName}\n` +
        `Parked Hours: ${data.parkedHours}\n` +
        `Amount to collect: Rs ${data.parkingFee}\n\n` +
        "Confirm payment collected and allow exit?";

      if (window.confirm(confirmText)) {
        exitForm.submit();
      }
    } catch (error) {
      alert("Something went wrong while calculating fee.");
    }
  });
}

if (entryForm && entryVehicleNumber && entryOwnerName && entryPhoneNumber) {
  let lookupRequestId = 0;

  const setKnownVehicleMode = (enabled, message = "") => {
    entryOwnerName.readOnly = enabled;
    entryPhoneNumber.readOnly = enabled;
    entryOwnerName.required = !enabled;
    entryPhoneNumber.required = !enabled;

    if (entryHint) {
      entryHint.textContent = message;
    }
  };

  const clearProfile = () => {
    entryOwnerName.value = "";
    entryPhoneNumber.value = "";
    setKnownVehicleMode(false, "");
  };

  entryVehicleNumber.addEventListener("blur", async () => {
    const value = String(entryVehicleNumber.value || "").trim().toUpperCase();
    entryVehicleNumber.value = value;

    if (!value) {
      clearProfile();
      return;
    }

    const currentRequestId = ++lookupRequestId;
    try {
      const response = await fetch(`/api/vehicle/lookup?number=${encodeURIComponent(value)}`);
      const data = await response.json();
      if (currentRequestId !== lookupRequestId) {
        return;
      }

      if (response.ok && data.found) {
        entryOwnerName.value = data.ownerName || "";
        entryPhoneNumber.value = data.phoneNumber || "";
        setKnownVehicleMode(true, "Existing vehicle found. Owner and phone are auto-filled. Enter purpose and submit.");
        return;
      }

      clearProfile();
      setKnownVehicleMode(false, "New vehicle number. Please fill owner name, phone, and purpose.");
    } catch (error) {
      setKnownVehicleMode(false, "");
    }
  });
}

const parkingSlots = document.querySelectorAll('.parking-slot.available');
const entrySlotInput = document.getElementById('entrySlot');

if (parkingSlots.length > 0 && entrySlotInput) {
  parkingSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      document.querySelectorAll('.parking-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      entrySlotInput.value = slot.getAttribute('data-slot');
    });
  });
}
