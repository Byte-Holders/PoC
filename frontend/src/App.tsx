import { useState, useEffect } from "react";
import "./App.css";
import markdown from "@wcj/markdown-to-html";
// import CloneRepo from "./CloneRepo";

interface Repository {
    _id: string;
    name: string;
    link: string;
}

function App() {
    const [conn, setConn] = useState("");
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>("");

    // Stati per la modale
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepoLink, setNewRepoLink] = useState("");
    const [newRepoName, setNewRepoName] = useState("");

    const startScan = () => {
        if(!selectedRepo) return alert("Seleziona una repo!");
        setConn("Scansione in corso... attendere...");

        console.log("Invio scan per:", selectedRepo);
        fetch("http://localhost:3000/agent/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repoLink: selectedRepo })
        })
            .then((res) => res.text().then((text) => setConn(text)))
            .catch(() => setConn("Errore nella richiesta"));
    };

    const fetchRepos = () => {
        fetch("http://localhost:3000/mongo/find_repo", { method: "POST" })
            .then((res) => res.json())
            .then((data: Repository[]) => {
                console.log("DATI RICEVUTI DAL SERVER:", data);
                setRepositories(data);
                if (data.length > 0 && !selectedRepo) {
                    setSelectedRepo(data[0].link);
                }
            })
            .catch((err) => console.error("Errore repo:", err));
    };

    useEffect(() => {
        fetchRepos();
    }, []);

    const addRepos = async () => {
        // 1. Validazione Frontend
        if (!newRepoName || !newRepoLink) {
            alert("Devi inserire sia il nome che il link!");
            return;
        }

        const newRepo = { name: newRepoName, link: newRepoLink };
        console.log("Sto inviando:", newRepo); // DEBUG

        try {
            const res = await fetch("http://localhost:3000/mongo/Add_repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRepo)
            });


            // 2. Controllo risposta (res.ok è true per 200-299)
            if (res.ok) {
                alert("Salvataggio riuscito!");
                fetchRepos();
            } else {
                // Leggiamo il messaggio di errore dal server
                const errorText = await res.text();
                console.error("Errore Backend:", errorText);
                alert(`Errore dal server: ${res.status} - ${errorText}`);
            }
        } catch (error) {
            console.error("Errore di rete:", error);
            alert("Impossibile contattare il server (Network Error)");
        }
    };

    const handleCloseModal = () => {
        setNewRepoName("");
        setNewRepoLink("");
        setIsModalOpen(false);
    };

    return (
        <>
            <div className='repo-selection'>
                <label htmlFor="repo-select">Repository: </label>
                <select
                    id="repo-select"
                    value={selectedRepo}
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
                {/* Bottone per aprire la modale */}
                <button className="btn-add" onClick={() => setIsModalOpen(true)} style={{marginLeft: '10px'}}>+</button>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Aggiungi Repository</h3>
                        <input
                            type="text"
                            placeholder="Nome (es. Firefox)"
                            value={newRepoName}
                            onChange={(e) => setNewRepoName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Link Git (https://...)"
                            value={newRepoLink}
                            onChange={(e) => setNewRepoLink(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={handleCloseModal}>Annulla</button>
                            <button className="btn-save" onClick={addRepos}>Salva</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENUTO CENTRALE */}
            <h1>PoC - Byte Holders</h1>
            <div>
                <button onClick={startScan}>
                    Avvio Scan
                </button>
                <h2>Ecco il Report!</h2>
                <p dangerouslySetInnerHTML={{__html: markdown(conn)}} style={{all: "initial", color: "white"}}></p>
            </div>
            {/*<div className="card">
            <CloneRepo />
            </div>*/}
        </>
    );
}

export default App;
