// @ts-nocheck
async function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.textContent = "Getting GPS location…";    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));

  try {
    const loc = await getLocation();

    msg.className = "alert alert-info";
    msg.textContent = `GPS locked (±${Math.round(loc.acc)}m). Sending…`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: loc.lat, lng: loc.lng })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Clock action failed");
    }

    msg.className = "alert alert-success";
    msg.textContent = "Success ✅ Refreshing…";
    setTimeout(() => window.location.reload(), 700);
  } catch (e) {
    msg.className = "alert alert-danger";
    msg.textContent = e.message || "Clock action failed";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inBtn = document.getElementById("clockInBtn");
  if (inBtn) inBtn.addEventListener("click", () => doClock("/driver/clock-in"));

  const outBtn = document.getElementById("clockOutBtn");
  if (outBtn) outBtn.addEventListener("click", () => doClock("/driver/clock-out"));
});

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

async function doClock(url) {
  const msg = document.getElementById("clockMsg");
  msg.className = "alert alert-info";