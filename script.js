"use strict";

// ================= DOM ELEMENTS =================
const searchBtn = document.getElementById("searchBtn");
const locationInput = document.getElementById("locationInput");
const statusEl = document.getElementById("status");

const weatherEl = document.getElementById("weather");
const cityNameEl = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const windEl = document.getElementById("wind");
const forecastEl = document.getElementById("forecast");

const conditionEl = document.getElementById("condition");
const tempUnitEl = document.getElementById("tempUnit");

const unitFBtn = document.getElementById("unitF");
const unitCBtn = document.getElementById("unitC");

const weatherFx = document.getElementById("weatherFx");
const dayNightEl = document.getElementById("dayNight");
const alertBadgeEl = document.getElementById("alertBadge");

// Tabs / Pages
const tabWeather = document.getElementById("tabWeather");
const tabAir = document.getElementById("tabAir");
const tabAlerts = document.getElementById("tabAlerts");

const pageWeather = document.getElementById("pageWeather");
const pageAir = document.getElementById("pageAir");
const pageAlerts = document.getElementById("pageAlerts");

// Air Quality
const aqiEl = document.getElementById("aqi");
const pm25El = document.getElementById("pm25");
const pm10El = document.getElementById("pm10");
const o3El = document.getElementById("o3");

// Alerts
const alertsListEl = document.getElementById("alertsList");

// Save last searched location
let lastLocation = null; // { latitude, longitude, name }

//Temp conversion
let tempUnit = "fahrenheit"; // "fahrenheit" | "celsius"

if (unitFBtn) {
  unitFBtn.addEventListener("click", async () => {
    tempUnit = "fahrenheit";
    unitFBtn.classList.add("active");
    unitCBtn?.classList.remove("active");
    if (lastLocation) {
      await fetchWeatherByCoords(
        lastLocation.latitude,
        lastLocation.longitude,
        lastLocation.name
      );
    }
  });
}

if (unitCBtn) {
  unitCBtn.addEventListener("click", async () => {
    tempUnit = "celsius";
    unitCBtn.classList.add("active");
    unitFBtn?.classList.remove("active");
    if (lastLocation) {
      await fetchWeatherByCoords(
        lastLocation.latitude,
        lastLocation.longitude,
        lastLocation.name
      );
    }
  });
}

// ================= HELPERS =================
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function requireLocation() {
  if (!lastLocation) {
    setStatus("Search a city or ZIP first.");
    return false;
  }
  return true;
}

// ================= SEARCH =================
if (searchBtn) {
  searchBtn.addEventListener("click", () => runSearch());
}

if (locationInput) {
  locationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });
}

function runSearch() {
  const input = (locationInput?.value || "").trim();
  if (!input) {
    setStatus("Please enter a city or ZIP code.");
    return;
  }

  if (/^\d{5}$/.test(input)) {
    fetchWeatherByZip(input);
  } else {
    fetchWeatherByCity(input);
  }
}

function fetchWeatherByCity(city) {
  fetchWeather(city);
}

// ZIP → lat/lon
async function fetchWeatherByZip(zip) {
  try {
    setStatus("Loading...");
    weatherEl?.classList.add("hidden");

    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) throw new Error("ZIP not found");

    const data = await res.json();
    const place = data.places?.[0];
    if (!place) throw new Error("No places");

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    const name = `${place["place name"]}, ${place["state abbreviation"]}`;

    lastLocation = { latitude, longitude, name };
    setActiveTab("weather");

    await fetchWeatherByCoords(latitude, longitude, name);
  } catch (err) {
    console.error(err);
    setStatus("ZIP code not found.");
  }
}

// City → lat/lon
async function fetchWeather(city) {
  try {
    setStatus("Loading...");
    weatherEl?.classList.add("hidden");

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    );
    const data = await res.json();
    if (!data.results?.length) throw new Error("City not found");

    const { latitude, longitude, name } = data.results[0];
    lastLocation = { latitude, longitude, name };
    setActiveTab("weather");

    await fetchWeatherByCoords(latitude, longitude, name);
  } catch (err) {
    console.error(err);
    setStatus("City not found.");
  }
}

// ================= TABS =================
if (tabWeather) {
  tabWeather.addEventListener("click", async () => {
    setActiveTab("weather");
    if (!requireLocation()) return;

    await fetchWeatherByCoords(
      lastLocation.latitude,
      lastLocation.longitude,
      lastLocation.name
    );
  });
}

if (tabAir) {
  tabAir.addEventListener("click", async () => {
    setActiveTab("air");
    if (!requireLocation()) return;

    await fetchAirQuality(lastLocation.latitude, lastLocation.longitude);
  });
}

if (tabAlerts) {
  tabAlerts.addEventListener("click", async () => {
    setActiveTab("alerts");
    if (!requireLocation()) return;

    setStatus("Loading NWS alerts...");
    await refreshAlerts(lastLocation.latitude, lastLocation.longitude, true);
    setStatus("");
  });
}

function setActiveTab(tab) {
  tabWeather?.classList.toggle("active", tab === "weather");
  tabAir?.classList.toggle("active", tab === "air");
  tabAlerts?.classList.toggle("active", tab === "alerts");

  pageWeather?.classList.toggle("hidden", tab !== "weather");
  pageAir?.classList.toggle("hidden", tab !== "air");
  pageAlerts?.classList.toggle("hidden", tab !== "alerts");
}

// ================= ENDPOINT #1: WEATHER =================
async function fetchWeatherByCoords(latitude, longitude, name) {
  try {
    setStatus("Loading weather...");

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current_weather=true` +
        `&daily=temperature_2m_max,temperature_2m_min` +
        `&temperature_unit=${tempUnit}` +
        `&windspeed_unit=mph` +
        `&timezone=auto`
    );
    if (!res.ok) throw new Error("Weather fetch failed");

    const data = await res.json();

    // Day/Night + local time chip (returns isDay)
    updateDayNight(data);

    // Current weather
    if (cityNameEl) cityNameEl.textContent = name;

    const currentTemp = data.current_weather?.temperature;
    const currentWind = data.current_weather?.windspeed;
    const code = data.current_weather?.weathercode;

    if (tempEl) {
      const prev = Number(tempEl.textContent);
      const next = currentTemp;

      tempEl.classList.add("bump");
      animateNumber(tempEl, prev, next, 520, 1);
      setTimeout(() => tempEl.classList.remove("bump"), 200);
    }

    if (windEl) windEl.textContent = currentWind ?? "—";
    setWindAnimation(currentWind);

    // Unit label next to current temp
    if (tempUnitEl)
      tempUnitEl.textContent = tempUnit === "celsius" ? "°C" : "°F";

    // Condition label (Clear/Rain/Snow/etc)
    if (conditionEl) {
      conditionEl.textContent =
        typeof code === "number" ? weatherCodeToText(code) : "—";
    }

    // Background / FX
    if (typeof code === "number") setBackground(code);

    // Forecast
    if (forecastEl) {
      forecastEl.innerHTML = "";
      const times = data.daily?.time || [];
      const maxes = data.daily?.temperature_2m_max || [];
      const mins = data.daily?.temperature_2m_min || [];
      const unitSymbol = tempUnit === "celsius" ? "°C" : "°F";

      times.forEach((day, i) => {
        const label = new Date(day).toLocaleDateString("en-US", {
          weekday: "short",
        });

        const div = document.createElement("div");
        div.className = "forecast-day";
        div.innerHTML = `
            <strong>${label}</strong>
            <p>${maxes[i] ?? "—"}${unitSymbol} / ${
          mins[i] ?? "—"
        }${unitSymbol}</p>
          `;
        forecastEl.appendChild(div);
      });
    }

    // Update badge (no list render on weather page)
    await refreshAlerts(latitude, longitude, false);

    setStatus("");
    weatherEl?.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setStatus("Weather request failed. Try again.");
  }
}

// ================= ENDPOINT #2: AIR QUALITY =================
async function fetchAirQuality(latitude, longitude) {
  try {
    setStatus("Loading air quality...");

    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=us_aqi,pm2_5,pm10,ozone&timezone=auto`
    );
    if (!res.ok) throw new Error("Air quality fetch failed");

    const data = await res.json();

    // Use the first hourly entry
    const idx = 0;

    if (aqiEl) aqiEl.textContent = data.hourly?.us_aqi?.[idx] ?? "—";
    if (pm25El) pm25El.textContent = data.hourly?.pm2_5?.[idx] ?? "—";
    if (pm10El) pm10El.textContent = data.hourly?.pm10?.[idx] ?? "—";
    if (o3El) o3El.textContent = data.hourly?.ozone?.[idx] ?? "—";

    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Air quality request failed. Try again.");
  }
}

// ================= ENDPOINT #3: NWS ALERTS =================
async function refreshAlerts(latitude, longitude, renderList) {
  // badge
  if (alertBadgeEl) {
    alertBadgeEl.classList.remove("hidden");
    alertBadgeEl.textContent = "⚠️ Checking alerts...";
  }

  if (renderList && alertsListEl) alertsListEl.innerHTML = "";

  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`
    );

    if (!res.ok) {
      if (alertBadgeEl)
        alertBadgeEl.textContent = "⚠️ Alerts unavailable (NWS)";
      if (renderList && alertsListEl) {
        alertsListEl.innerHTML = `
          <div class="alert-card">
            <div class="alert-title">Alerts unavailable</div>
            <div class="alert-desc">Could not load alerts right now.</div>
          </div>
        `;
      }
      return;
    }

    const data = await res.json();
    const features = data.features || [];
    const count = features.length;

    if (count === 0) {
      if (alertBadgeEl) alertBadgeEl.textContent = "✅ No active alerts";
      if (renderList && alertsListEl) {
        alertsListEl.innerHTML = `
          <div class="alert-card">
            <div class="alert-title">No active alerts</div>
            <div class="alert-desc">There are currently no watches/warnings/advisories for this area.</div>
          </div>
        `;
      }
      return;
    }

    if (alertBadgeEl) alertBadgeEl.textContent = `⚠️ Active Alerts: ${count}`;

    if (renderList && alertsListEl) {
      alertsListEl.innerHTML = features
        .slice(0, 8)
        .map((f) => {
          const p = f.properties || {};
          const event = p.event || "Alert";
          const severity = p.severity || "Unknown";
          const urgency = p.urgency || "Unknown";
          const headline = p.headline || "";
          const ends = p.ends || p.expires || "";
          const descRaw = p.description || "";
          const desc =
            descRaw.length > 280 ? descRaw.slice(0, 280) + "..." : descRaw;

          return `
            <div class="alert-card">
              <div class="alert-title">${event}</div>
              <div class="alert-meta">
                Severity: <strong>${severity}</strong> • Urgency: <strong>${urgency}</strong>
                ${
                  ends
                    ? `• Ends: <strong>${new Date(
                        ends
                      ).toLocaleString()}</strong>`
                    : ""
                }
              </div>
              ${
                headline
                  ? `<div class="alert-desc"><strong>${headline}</strong></div>`
                  : ""
              }
              ${
                desc
                  ? `<div class="alert-desc">${desc.replace(
                      /\n/g,
                      "<br>"
                    )}</div>`
                  : ""
              }
            </div>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error(err);
    if (alertBadgeEl) alertBadgeEl.textContent = "⚠️ Alerts check failed";
    if (renderList && alertsListEl) {
      alertsListEl.innerHTML = `
        <div class="alert-card">
          <div class="alert-title">Alerts check failed</div>
          <div class="alert-desc">Please try again.</div>
        </div>
      `;
    }
  }
}

//Wind animation
function setWindAnimation(mph) {
  // clamp to a reasonable range so it doesn't get ridiculous
  const w = Math.max(0, Math.min(Number(mph) || 0, 35));

  // Map wind speed -> duration (lower duration = faster animation)
  // 0 mph  -> ~3.2s
  // 10 mph -> ~2.2s
  // 25 mph -> ~1.4s
  const duration = 3.2 - (w / 35) * 1.8; // 3.2 -> 1.4

  document.documentElement.style.setProperty(
    "--wind-speed",
    `${duration.toFixed(2)}s`
  );
}

// ================= DAY / NIGHT CHIP =================
function updateDayNight(weatherData) {
  const offsetSec = weatherData?.utc_offset_seconds;
  if (typeof offsetSec !== "number" || !dayNightEl) return;

  // "Now" in UTC -> apply the location offset from Open-Meteo
  const nowUtcMs = Date.now();
  const localMs = nowUtcMs + offsetSec * 1000;
  const localDate = new Date(localMs);

  // Use "UTC" timezone to prevent the browser from re-applying its own offset
  const hour = Number(
    localDate.toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "UTC",
    })
  );

  const isDay = hour >= 6 && hour < 18;

  const formattedTime = localDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

  document.body.classList.toggle("day", isDay);
  document.body.classList.toggle("night", !isDay);

  const tz = weatherData.timezone_abbreviation || "";
  dayNightEl.textContent = isDay
    ? `☀️ Day • ${formattedTime} ${tz}`
    : `🌙 Night • ${formattedTime} ${tz}`;

  return isDay;
}

// ================= BACKGROUND / FX =================
function setBackground(code) {
  document.body.classList.remove(
    "clear",
    "cloudy",
    "fog",
    "rain",
    "snow",
    "storm"
  );
  if (weatherFx) weatherFx.className = "fx";

  if (code === 0) add("clear");
  else if (code >= 1 && code <= 3) add("cloudy");
  else if (code === 45 || code === 48) add("fog");
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    add("rain");
  else if (code >= 71 && code <= 77) add("snow");
  else if (code >= 95) add("storm");

  function add(cls) {
    document.body.classList.add(cls);
    weatherFx?.classList.add(cls);
  }
}

//============Weather code=============
function weatherCodeToText(code) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

function animateNumber(el, from, to, durationMs = 500, decimals = 1) {
  if (!el) return;

  const start = performance.now();
  const f = Number(from);
  const t = Number(to);

  // If values are missing, just set immediately
  if (!Number.isFinite(f) || !Number.isFinite(t)) {
    el.textContent = Number.isFinite(t) ? t.toFixed(decimals) : "—";
    return;
  }

  function tick(now) {
    const p = Math.min(1, (now - start) / durationMs);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - p, 3);
    const val = f + (t - f) * eased;

    el.textContent = val.toFixed(decimals);

    if (p < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
