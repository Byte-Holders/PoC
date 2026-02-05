import { useState } from "react";
import "./App.css";

function App() {
  const [conn, setConn] = useState("");

  const checkConn = () => {
    fetch("http://localhost:3000/agent/scan", { method: "GET" })
      .then(
        (res) => res.text().then((text) => setConn(text)),
        () => setConn("err'd")
      );
  };

  return (
    <>
      <div>

      </div>
      <h1>PoC - Byte Holders</h1>
      <div className="card">
        <button
          onClick={() => {
            checkConn();
          }}
        >
          Avvio Scan
          <br />
        </button>
          <h2>Ecco il Report!</h2>
          <p>
               {conn}
          </p>
      </div>
    </>
  );
}

export default App;
