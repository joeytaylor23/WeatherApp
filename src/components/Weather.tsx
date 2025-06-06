import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Weather.css';

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
    feels_like: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  name: string;
  wind: {
    speed: number;
    deg: number;
  };
  sys: {
    sunrise: number;
    sunset: number;
  };
}

interface ForecastData {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    wind: {
      speed: number;
      deg: number;
    };
  }>;
}

interface City {
  name: string;
  country: string;
}

const Weather: React.FC = () => {
  const [city, setCity] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
  const API_URL = 'https://api.openweathermap.org/data/2.5';

  useEffect(() => {
    // Click outside suggestions handler
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Get user's location on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await axios.get<WeatherData>(
              `${API_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`
            );
            setWeather(response.data);
            fetchForecast(response.data.name);
          } catch (error: any) {
            console.error('Error fetching weather by location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  const fetchWeather = async (searchCity: string) => {
    setLoading(true);
    try {
      const response = await axios.get<WeatherData>(
        `${API_URL}/weather?q=${searchCity}&appid=${API_KEY}&units=${unit}`
      );
      setWeather(response.data);
      await fetchForecast(searchCity);
      setError('');
    } catch (error: any) {
      console.error('Error fetching weather:', error);
      setError(error.response?.data?.message || 'City not found or error fetching weather data');
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async (searchCity: string) => {
    try {
      const response = await axios.get<ForecastData>(
        `${API_URL}/forecast?q=${searchCity}&appid=${API_KEY}&units=${unit}`
      );
      setForecast(response.data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  };

  const fetchCitySuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get<City[]>(
        `${API_URL}/geo/1.0/direct?q=${searchTerm}&limit=5&appid=${API_KEY}`
      );
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    fetchCitySuggestions(value);
  };

  const handleSuggestionClick = (cityName: string) => {
    setCity(cityName);
    setShowSuggestions(false);
    fetchWeather(cityName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeather(city);
      setShowSuggestions(false);
    }
  };

  const toggleUnit = () => {
    setUnit(prev => {
      const newUnit = prev === 'metric' ? 'imperial' : 'metric';
      if (weather) {
        fetchWeather(weather.name);
      }
      return newUnit;
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <div className="weather-container">
      <div className="search-section">
        <form onSubmit={handleSubmit}>
          <div className="search-container" ref={suggestionsRef}>
            <input
              type="text"
              value={city}
              onChange={handleInputChange}
              placeholder="Enter city name"
              className="search-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion.name)}
                  >
                    {suggestion.name}, {suggestion.country}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        <button onClick={toggleUnit} className="unit-toggle">
          {unit === 'metric' ? '°C to °F' : '°F to °C'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      
      {loading && <div className="loading">Loading weather data...</div>}
      
      {weather && (
        <div className="weather-info">
          <h2>{weather.name}</h2>
          <div className="weather-details">
            <img
              src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
              alt={weather.weather[0].description}
            />
            <p className="temperature">
              {Math.round(weather.main.temp)}°{unit === 'metric' ? 'C' : 'F'}
            </p>
            <p className="description">{weather.weather[0].description}</p>
            <div className="additional-info">
              <p>Feels like: {Math.round(weather.main.feels_like)}°{unit === 'metric' ? 'C' : 'F'}</p>
              <p>Humidity: {weather.main.humidity}%</p>
              <p>Wind: {Math.round(weather.wind.speed)} {unit === 'metric' ? 'm/s' : 'mph'} {getWindDirection(weather.wind.deg)}</p>
              <p>Sunrise: {formatTime(weather.sys.sunrise)}</p>
              <p>Sunset: {formatTime(weather.sys.sunset)}</p>
            </div>
          </div>
        </div>
      )}

      {forecast && (
        <div className="forecast">
          <h3>5-Day Forecast</h3>
          <div className="forecast-items">
            {forecast.list
              .filter((item, index) => index % 8 === 0) // Get one reading per day
              .slice(0, 5) // Limit to 5 days
              .map((item, index) => (
                <div key={index} className="forecast-item">
                  <p className="forecast-date">
                    {new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'short' })}
                  </p>
                  <img
                    src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                    alt={item.weather[0].description}
                  />
                  <p className="forecast-temp">
                    {Math.round(item.main.temp)}°{unit === 'metric' ? 'C' : 'F'}
                  </p>
                  <p className="forecast-desc">{item.weather[0].description}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Weather; 