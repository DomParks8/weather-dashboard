const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const statusEl = document.getElementById("status");
const weatherEl = document.getElementById("weather");

const cityNameEl = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const windEl = document.getElementById("wind");
const forecastEl = document.getElementById("forecast");

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    statusEl.textContent = "Please enter a city.";
    return;
  }
  fetchWeather(city);
});

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

    // Current weather
    cityNameEl.textContent = name;
    tempEl.textContent = weatherData.current_weather.temperature;
    windEl.textContent = weatherData.current_weather.windspeed;

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
