const searchBtn = document.getElementById("searchBtn");
// const cityInput = document.getElementById("cityInput");
const locationInput = document.getElementById("locationInput");
const statusEl = document.getElementById("status");
const weatherEl = document.getElementById("weather");

const cityNameEl = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const windEl = document.getElementById("wind");
const forecastEl = document.getElementById("forecast");
const weatherFx = document.getElementById("weatherFx");
const dayNightEl = document.getElementById("dayNight");

/*searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    statusEl.textContent = "Please enter a city.";
    return;
  }
  fetchWeather(city);
});*/

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
  fetchWeather(city); // reuse existing function
}

function fetchWeatherByZip(zip) {
  // Convert ZIP -> location name using Open-Meteo geocoding,
  // then reuse fetchWeather() by passing the returned name
  fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&country=US`
  )
    .then((res) => res.json())
    .then((geoData) => {
      if (!geoData.results || geoData.results.length === 0) {
        statusEl.textContent = "ZIP code not found.";
        return;
      }

      const name = geoData.results[0].name;
      fetchWeather(name);
    })
    .catch((err) => {
      statusEl.textContent = "Error looking up ZIP code.";
      console.error(err);
    });
}

async function fetchWeatherByZip(zip) {
  try {
    statusEl.textContent = "Loading...";
    weatherEl.classList.add("hidden");

    // ZIP -> lat/lon using Zippopotam.us (accurate for US ZIP codes)
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

    await fetchWeatherByCoords(latitude, longitude, locationLabel);
  } catch (err) {
    statusEl.textContent = "Error looking up ZIP code.";
    console.error(err);
  }
}

async function fetchWeatherByCoords(latitude, longitude, name) {
  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`
    );
    const weatherData = await weatherRes.json();

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
    statusEl.textContent = "Something went wrong. Please try again.";
    console.error(err);
  }
}

async function fetchWeather(city) {
  try {
    statusEl.textContent = "Loading...";
    weatherEl.classList.add("hidden");

    // 1️⃣ Geocoding (city → lat/lon)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
    );
    const geoData = await geoRes.json();

    if (!geoData.results) {
      statusEl.textContent = "City not found.";
      return;
    }

    const { latitude, longitude, name } = geoData.results[0];

    // 2️⃣ Weather data
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    updateDayNight(weatherData);

    // Current weather
    cityNameEl.textContent = name;
    tempEl.textContent = weatherData.current_weather.temperature;
    windEl.textContent = weatherData.current_weather.windspeed;

    //Weather-based background
    const weatherCode = weatherData.current_weather.weathercode;
    console.log("Weather code:", weatherCode);
    setBackground(weatherCode);

    // Forecast
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
  } catch (error) {
    statusEl.textContent = "Something went wrong. Please try again.";
    console.error(error);
  }
}

function updateDayNight(weatherData) {
  // Open-Meteo returns current_weather.time in the location's local time
  const localIso = weatherData?.current_weather?.time;
  if (!localIso) return;

  const hour = new Date(localIso).getHours();
  const isDay = hour >= 6 && hour < 18;

  // Add/remove body classes
  document.body.classList.toggle("day", isDay);
  document.body.classList.toggle("night", !isDay);

  // Update badge text
  /*dayNightEl.textContent = isDay
    ? `☀️ Daytime (Local)`
    : `🌙 Nighttime (Local)`;*/

  dayNightEl.textContent = isDay
    ? "☀️ Day • Local time"
    : "🌙 Night • Local time";
}

/*function setBackground(code) {
  //document.body.className = "";
  const classes = ["clear", "cloudy", "fog", "rain", "snow", "storm"];
  document.body.classList.remove(...classes);

  if (code === 0) {
    document.body.classList.add("clear");
  } else if (code >= 1 && code <= 3) {
    document.body.classList.add("cloudy");
  } else if (code === 45 || code === 48) {
    document.body.classList.add("fog");
  } else if (code >= 51 && code <= 67) {
    document.body.classList.add("rain");
  } else if (code >= 71 && code <= 77) {
    document.body.classList.add("snow");
  } else if (code >= 95) {
    document.body.classList.add("storm");
  }
}*/

function setBackground(code) {
  // remove old background classes
  document.body.classList.remove(
    "clear",
    "cloudy",
    "fog",
    "rain",
    "snow",
    "storm"
  );

  // reset overlay
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
