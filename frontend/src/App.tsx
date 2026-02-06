import { useState, useEffect } from "react";import "./App.css";


interface Repository {
    _id: string;
    name: string;
    link: string;
}

function App() {
  const [conn, setConn] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

    // 2. Funzione di Scan aggiornata per inviare i dati in POST
    const startScan = () => {
        console.log("Invio scan per:", selectedRepo);

        fetch("http://localhost:3000/agent/scan", {
            method: "POST", // Cambiamo in POST come richiesto
            headers: {
                "Content-Type": "application/json"
            },
            // Inviamo il link selezionato nel corpo della richiesta
            body: JSON.stringify({ repoLink: selectedRepo })
        })
            .then(
                (res) => res.text().then((text) => setConn(text)),
                () => setConn("Errore nella richiesta")
            );
    };

    const fetchRepos = () => {
        fetch("http://localhost:3000/mongo/find_repo", { method: "POST" })
            .then((res) => res.json())
            .then((data: Repository[]) => {
                setRepositories(data);
                // Opzionale: Seleziona automaticamente il primo risultato se esiste
                if (data.length > 0) {
                    setSelectedRepo(data[0].link);
                }
            })
            .catch((err) => console.error("Errore repo:", err));
    };
    useEffect(() => {
        fetchRepos();
    }, []);

  return (
    <>
        <div className='repo-selection'>
            {/* Rimosso il <form>, basta una label e la select */}
            <label htmlFor="repo-select">Repository: </label>
            <select
                name="repo"
                id="repo-select"
                value={selectedRepo}
                // 3. Aggiorniamo lo stato ogni volta che l'utente cambia voce
                onChange={(e) => setSelectedRepo(e.target.value)}
            >
                {repositories.length > 0 ? (
                    repositories.map((repo) => (
                        <option key={repo._id} value={repo.link}>
                            {repo.name}
                        </option>
                    ))
                ) : (
                    <option value="">Caricamento...</option>
                )}
            </select>
        </div>
      <h1>PoC - Byte Holders</h1>
      <div>
        <button
          onClick={() => {
              startScan();
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
