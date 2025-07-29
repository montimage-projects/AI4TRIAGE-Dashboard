import React from "react";
import "./App.css";
import Table from "./Table";
import logo from "./assets/logo.png";  // Import the logo

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} alt="AI4Cyber Logo" className="App-logo" />
      </header>
      <h1>AI4TRIAGE Alerts</h1>
      <Table />
      <footer className="App-footer">
        <p>AI4TRIAGE ©2025 Created by Montimage. Version 1.0.0</p>
      </footer>
    </div>
  );
}

export default App;

