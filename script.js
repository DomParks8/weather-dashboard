// --------- DOM Elements ---------
const searchBtn = document.getElementById("searchBtn");
const locationInput = document.getElementById("locationInput");
const statusEl = document.getElementById("status");

const weatherEl = document.getElementById("weather");
const cityNameEl = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const windEl = document.getElementById("wind");
const forecastEl = document.getElementById("forecast");

const weatherFx = document.getElementById("weatherFx");
const dayNightEl = document.getElementById("dayNight");

// Tabs / Pages
const tabWeather = document.getElementById("tabWeather");
const tabAir = document.getElementById("tabAir");
const pageWeather = document.getElementById("pageWeather");
const pageAir = document.getElementById("pageAir");

// Air Quality outputs
const aqiEl = document.getElementById("aqi");
const pm25El = document.getElementById("pm25");
const pm10El = document.getElementById("pm10");
const o3El = document.getElementById("o3");

// Save last searched location so nav can re-fetch
let lastLocation = null; // { latitude, longitude, name }

// --------- Search Handling ---------
searchBtn.addEventListener("click", () => {
  const input = locationInput.value.trim();

  if (!input) {
    statusEl.textContent = "Please enter a city or ZIP code.";
    return;
  }

  if (/^\d{5}$/.test(input)) {
    fetchWeatherByZip(input);
  } else {
    fetchWeatherByCity(input);
  }
});

function fetchWeatherByCity(city) {
  fetchWeather(city);
}

// ZIP -> lat/lon using Zippopotam.us (accurate)
async function fetchWeatherByZip(zip) {
  try {
    statusEl.textContent = "Loading...";
    weatherEl.classList.add("hidden");

    const zipRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!zipRes.ok) {
      statusEl.textContent = "ZIP code not found.";
      return;
    }

    const zipData = await zipRes.json();
    const place = zipData.places?.[0];
    if (!place) {
      statusEl.textContent = "ZIP code not found.";
      return;
    }

    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    const locationLabel = `${place["place name"]}, ${place["state abbreviation"]}`;

    // Save for tab navigation
    lastLocation = { latitude, longitude, name: locationLabel };

    // Default to Weather tab after a search
    setActiveTab("weather");

    // Fetch Weather endpoint (GET)
    await fetchWeatherByCoords(latitude, longitude, locationLabel);
  } catch (err) {
    statusEl.textContent = "Error looking up ZIP code.";
    console.error(err);
  }
}

// City -> lat/lon using Open-Meteo geocoding, then coords -> weather
async function fetchWeather(city) {
  try {
    statusEl.textContent = "Loading...";
    weatherEl.classList.add("hidden");

    // Geocoding (city -> lat/lon)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      statusEl.textContent = "City not found.";
      return;
    }

    const { latitude, longitude, name } = geoData.results[0];

    // Save for tab navigation
    lastLocation = { latitude, longitude, name };

    // Default to Weather tab after a search
    setActiveTab("weather");

    // Fetch Weather endpoint (GET)
    await fetchWeatherByCoords(latitude, longitude, name);
  } catch (error) {
    statusEl.textContent = "Something went wrong. Please try again.";
    console.error(error);
  }
}

// --------- Tabs (Navigation Between Endpoints) ---------
tabWeather.addEventListener("click", async () => {
  setActiveTab("weather");
  if (!lastLocation) {
    statusEl.textContent = "Search a city or ZIP first.";
    return;
  }

  // NEW GET request to Weather endpoint
  await fetchWeatherByCoords(
    lastLocation.latitude,
    lastLocation.longitude,
    lastLocation.name
  );
});

tabAir.addEventListener("click", async () => {
  setActiveTab("air");
  if (!lastLocation) {
    statusEl.textContent = "Search a city or ZIP first.";
    return;
  }

  // NEW GET request to Air Quality endpoint
  await fetchAirQuality(lastLocation.latitude, lastLocation.longitude);
});

function setActiveTab(which) {
  const isWeather = which === "weather";

  tabWeather.classList.toggle("active", isWeather);
  tabAir.classList.toggle("active", !isWeather);

  pageWeather.classList.toggle("hidden", !isWeather);
  pageAir.classList.toggle("hidden", isWeather);
}

// --------- Endpoint #1: Weather Forecast (Open-Meteo) ---------
async function fetchWeatherByCoords(latitude, longitude, name) {
  try {
    statusEl.textContent = "Loading weather...";

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    updateDayNight(weatherData);

    cityNameEl.textContent = name;
    tempEl.textContent = weatherData.current_weather.temperature;
    windEl.textContent = weatherData.current_weather.windspeed;

    const weatherCode = weatherData.current_weather.weathercode;
    setBackground(weatherCode);

    forecastEl.innerHTML = "";
    weatherData.daily.time.forEach((day, index) => {
      const div = document.createElement("div");
      div.className = "forecast-day";
      div.innerHTML = `
        <strong>${new Date(day).toLocaleDateString("en-US", {
          weekday: "short",
        })}</strong>
        <p>${weatherData.daily.temperature_2m_max[index]}° /
        ${weatherData.daily.temperature_2m_min[index]}°</p>
      `;
      forecastEl.appendChild(div);
    });

    statusEl.textContent = "";
    weatherEl.classList.remove("hidden");
  } catch (err) {
    statusEl.textContent = "Weather request failed. Try again.";
    console.error(err);
  }
}

// --------- Endpoint #2: Air Quality (Open-Meteo) ---------
async function fetchAirQuality(latitude, longitude) {
  try {
    statusEl.textContent = "Loading air quality...";

    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=us_aqi,pm2_5,pm10,ozone&timezone=auto`
    );
    const data = await res.json();

    // Use the first hourly entry for the assignment
    const idx = 0;

    aqiEl.textContent = data.hourly?.us_aqi?.[idx] ?? "—";
    pm25El.textContent = data.hourly?.pm2_5?.[idx] ?? "—";
    pm10El.textContent = data.hourly?.pm10?.[idx] ?? "—";
    o3El.textContent = data.hourly?.ozone?.[idx] ?? "—";

    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Air quality request failed. Try again.";
    console.error(err);
  }
}

// --------- Day/Night Indicator (Local Time at Location) ---------
function updateDayNight(weatherData) {
  const localIso = weatherData?.current_weather?.time;
  if (!localIso) return;

  const localDate = new Date(localIso);
  const hour = localDate.getHours();
  const isDay = hour >= 6 && hour < 18;

  const formattedTime = localDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  document.body.classList.toggle("day", isDay);
  document.body.classList.toggle("night", !isDay);

  const tz = weatherData.timezone_abbreviation || "";
  dayNightEl.textContent = isDay
    ? `☀️ Day • ${formattedTime} ${tz}`
    : `🌙 Night • ${formattedTime} ${tz}`;
}

// --------- Background + Weather FX ---------
function setBackground(code) {
  document.body.classList.remove(
    "clear",
    "cloudy",
    "fog",
    "rain",
    "snow",
    "storm"
  );
  weatherFx.className = "fx";

  if (code === 0) {
    document.body.classList.add("clear");
    weatherFx.classList.add("clear");
  } else if (code >= 1 && code <= 3) {
    document.body.classList.add("cloudy");
    weatherFx.classList.add("cloudy");
  } else if (code === 45 || code === 48) {
    document.body.classList.add("fog");
    weatherFx.classList.add("fog");
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    document.body.classList.add("rain");
    weatherFx.classList.add("rain");
  } else if (code >= 71 && code <= 77) {
    document.body.classList.add("snow");
    weatherFx.classList.add("snow");
  } else if (code >= 95) {
    document.body.classList.add("storm");
    weatherFx.classList.add("storm");
  }
}
