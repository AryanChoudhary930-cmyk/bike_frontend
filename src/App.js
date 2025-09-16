import React, { useState, useEffect } from "react";
import axios from "axios"; // Make sure you have axios installed: npm install axios
import "./App.css";

function App() {
  // State to hold all the dynamic data fetched from the Flask backend
  const [mappings, setMappings] = useState({ brands: {}, models: {}, locations: {} });
  
  // State for the form inputs
  const [formData, setFormData] = useState({
    brand: "", model: "", location: "", year: "", kilometers: "", power: "", owner: "First Owner",
  });
  
  // State to hold the list of models available for the selected brand
  const [availableModels, setAvailableModels] = useState([]);
  
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to convert a string to a more readable Title Case
  const toTitleCase = (str) => {
    if (typeof str !== 'string' || !str) {
      return "";
    }
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fetch Mappings from Flask on Initial Load
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/get_data_mappings");
        setMappings(response.data);
        console.log("Successfully fetched data mappings from backend.", response.data);
      } catch (err) {
        console.error("Error fetching data mappings:", err);
        setError("Could not connect to the backend. Please ensure the Flask server is running.");
      }
    };
    fetchMappings();
  }, []);

  // Update Available Models when a Brand is Selected
  useEffect(() => {
    if (formData.brand && mappings.models) {
      const selectedBrandName = Object.keys(mappings.brands).find(
        (brandName) => mappings.brands[brandName] === parseInt(formData.brand)
      );

      if (selectedBrandName) {
        const filteredModels = Object.entries(mappings.models).filter(([modelName, modelCode]) => 
          modelName.startsWith(selectedBrandName)
        );
        setAvailableModels(filteredModels);
      }
    } else {
      setAvailableModels([]);
    }
  }, [formData.brand, mappings]);


  // It resets the model whenever the brand is changed
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prevData => {
      const newData = { ...prevData, [name]: value };
      // If the brand was changed, we must reset the model field
      if (name === "brand") {
        newData.model = "";
      }
      return newData;
    });

    setError("");
    setPrediction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPrediction(null);
    setIsLoading(true);

    const requiredFields = ['brand', 'model', 'location', 'year', 'kilometers', 'power'];
    if (requiredFields.some(field => !formData[field])) {
      setError("Please fill in all the fields.");
      setIsLoading(false);
      return;
    }

    try {
      const yearInt = parseInt(formData.year);
      const kilometersInt = parseInt(formData.kilometers);
      const powerInt = parseInt(formData.power);
      
      const oneHotOwner = {
        'owner_Second Owner': formData.owner === 'Second Owner' ? 1 : 0,
        'owner_Third Owner': formData.owner === 'Third Owner' ? 1 : 0,
        'owner_Fourth Owner Or More': formData.owner === 'Fourth Owner Or More' ? 1 : 0,
        'owner_Unknown': formData.owner === 'Unknown' ? 1 : 0
      };

      const payload = {
        brand: parseInt(formData.brand),
        model: parseInt(formData.model),
        location: parseInt(formData.location),
        year: yearInt,
        kilometers: kilometersInt,
        power: powerInt,
        ...oneHotOwner,
      };

      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setTimeout(() => {
        setPrediction(data.prediction);
        setIsLoading(false);
      }, 1000);

    } catch (err) {
      console.error("Error submitting form:", err);
      setError(`${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="floating-elements">
        <div className="floating-bike">🏍️</div>
        <div className="floating-gear">⚙️</div>
        <div className="floating-wheel">🛞</div>
      </div>
      
      <div className="container">
        <div className="header">
          <div className="logo">
            <span className="bike-icon">🏍️</span>
            <h1>Bike Predict</h1>
          </div>
          <p className="subtitle">AI-Powered Motorcycle Valuation</p>
        </div>

        <form onSubmit={handleSubmit} className="prediction-form">
          
          <div className="form-group">
            <label>Brand</label>
            <div className="select-wrapper">
              <select name="brand" value={formData.brand} onChange={handleChange} required>
                <option value="">Choose your brand</option>
                {Object.entries(mappings.brands).map(([brandName, brandCode]) => (
                  <option key={brandCode} value={brandCode}>{toTitleCase(brandName)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Model</label>
            <div className="select-wrapper">
              <select name="model" value={formData.model} onChange={handleChange} required disabled={!formData.brand}>
                <option value="">Select model</option>
                {availableModels.map(([modelName, modelCode]) => (
                  <option key={modelCode} value={modelCode}>{toTitleCase(modelName)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <div className="select-wrapper">
              <select name="location" value={formData.location} onChange={handleChange} required>
                <option value="">Select location</option>
                {Object.entries(mappings.locations).map(([locName, locCode]) => (
                    <option key={locCode} value={locCode}>{locName}</option>
                ))}
                <option value="-1">Other</option> 
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input type="number" name="year" placeholder="2020" value={formData.year} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Power (CC)</label>
              <input type="number" name="power" placeholder="150" value={formData.power} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Kilometers Driven</label>
            <input type="number" name="kilometers" placeholder="25000" value={formData.kilometers} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Owner Type</label>
            <div className="select-wrapper">
              <select name="owner" value={formData.owner} onChange={handleChange} required>
                <option value="First Owner">First Owner</option>
                <option value="Second Owner">Second Owner</option>
                <option value="Third Owner">Third Owner</option>
                <option value="Fourth Owner Or More">Fourth Owner Or More</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>

          <button type="submit" className="predict-btn" disabled={isLoading}>
            {isLoading ? (
              <><div className="spinner"></div> Analyzing...</>
            ) : (
              <><span className="btn-icon">🔮</span> Predict Price</>
            )}
          </button>
        </form>

        <div className="results-area">
          {prediction !== null && (
            <div className="prediction-result">
              <div className="price-label">Predicted Value</div>
              <div className="price-value">
                {prediction.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </div>
              <div className="price-note">*Based on current market trends</div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;