import { useState, useEffect } from "react";
import "./App.css";
import markdown from "@wcj/markdown-to-html";

interface Repository {
    _id: string;
    name: string;
    link: string;
}

interface Report {
    _id: string;
    name: string;
    description: string;
    report : string;
    date: Date;
}

function App() {
    const [conn, setConn] = useState("");
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>("");
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<string>("");


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepoLink, setNewRepoLink] = useState("");
    const [newRepoName, setNewRepoName] = useState("");


    useEffect(() => {
        fetchRepos();
    }, []);


    useEffect(() => {
        if (selectedRepo) {
            console.log("Cambio repo rilevato, cerco i report per:", selectedRepo);
            fetchReports();
        } else {
            setReports([]);
            setConn("");
        }
    }, [selectedRepo]);


    const startScan = () => {
        if(!selectedRepo) return alert("Seleziona una repo!");
        setConn("Scansione in corso... attendere...");

        fetch("http://localhost:3000/agent/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repoLink: selectedRepo })
        })
            .then((res) => res.text().then((text) => setConn(JSON.parse(text)[0].report)))
            .catch(() => setConn("Errore nella richiesta"));
    };

    const fetchRepos = () => {
        fetch("http://localhost:3000/mongo/find_repo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        })
            .then((res) => res.json())
            .then((data: Repository[]) => {
                setRepositories(data);
            })
            .catch((err) => console.error("Errore repo:", err));
    };

    const fetchReports = () => {
        // Pulisce la visualizzazione precedente
        setConn("");

        fetch("http://localhost:3000/mongo/find_report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ link: selectedRepo })
        })
            .then((res) => res.json())
            .then((data: Report[]) => {
                setReports(data);
                // Reset della selezione report
                setSelectedReport("");
            })
            .catch((err) => console.error("Errore report:", err));
    };

    const addRepos = async () => {
        if (!newRepoName || !newRepoLink) {
            alert("Devi inserire sia il nome che il link!");
            return;
        }

        const newRepo = { name: newRepoName, link: newRepoLink };

        try {
            const res = await fetch("http://localhost:3000/mongo/Add_repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRepo)
            });

            if (res.ok) {
                alert("Salvataggio riuscito!");
                fetchRepos();
                handleCloseModal(); // Chiudi modale dopo successo
            } else {
                const errorText = await res.text();
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
                    <option value="">Seleziona Repository</option>
                    {repositories.map((repo) => (
                        <option key={repo._id} value={repo.link}>
                            {repo.name}
                        </option>
                    ))}
                </select>
                <button className="btn-add" onClick={() => setIsModalOpen(true)} style={{marginLeft: '10px'}}>+</button>
            </div>

            <div id="report-selection" className='repo-selection'>
                <label htmlFor="report-select">Reports: </label>
                <select
                    id="report-select"
                    value={selectedReport}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSelectedReport(val);
                        if(val) setConn(val);
                        else setConn("");
                    }}
                >
                    <option value="">Seleziona Report</option>
                    {reports.map((r) => (
                        <option key={r._id} value={r.report}>
                            {new Date(r.date).toLocaleString('it-IT')}
                        </option>
                    ))}
                </select>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Aggiungi Repository</h3>
                        <input type="text" placeholder="Nome" value={newRepoName} onChange={(e)=>setNewRepoName(e.target.value)}/>
                        <input type="text" placeholder="Link" value={newRepoLink} onChange={(e)=>setNewRepoLink(e.target.value)}/>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={handleCloseModal}>Annulla</button>
                            <button className="btn-save" onClick={addRepos}>Salva</button>
                        </div>
                    </div>
                </div>
            )}

            <h1>PoC - Byte Holders</h1>
            <div>
                <button onClick={startScan}>Avvio Scan</button>
                <h2>Ecco il Report!</h2>
                <p dangerouslySetInnerHTML={{__html: markdown(conn)}} style={{all: "initial", color: "white"}}></p>
            </div>
        </>
    );
}

export default App;
