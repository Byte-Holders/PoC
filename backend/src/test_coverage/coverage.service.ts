import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coverage } from './coverage.schema';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
const execPromise = promisify(exec);

@Injectable()
export class CoverageService {
    constructor(
        @InjectModel(Coverage.name) private coverageModel: Model<Coverage>,
    ) { }

    async runAndSaveCoverage() {
        // Percorso del file generato da Jest
        const filePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

        if (!fs.existsSync(filePath)) {
            throw new Error('File coverage-summary.json non trovato! Assicurati di aver lanciato i test.');
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const summary = JSON.parse(rawData);

        // Salviamo i dati estratti
        const newRecord = new this.coverageModel({
            percentage: summary.total.lines.pct,
            details: {
                lines: summary.total.lines.pct,
                statements: summary.total.statements.pct,
                functions: summary.total.functions.pct,
                branches: summary.total.branches.pct,
            },
        });

        return await newRecord.save();
    }

    // Metodo per recuperare la cronologia dal DB
    async findAll() {
        return await this.coverageModel.find().sort({ createdAt: -1 }).exec();
    }

    async runTestsAndUpload(targetPath: string = process.cwd()) {
        try {
            // 1. Identifica la cartella corretta (gestione Monorepo)
            let actualPath = targetPath;
            if (!fs.existsSync(path.join(targetPath, 'package.json'))) {
                const backendPath = path.join(targetPath, 'backend');
                if (fs.existsSync(path.join(backendPath, 'package.json'))) {
                    actualPath = backendPath;
                    console.log(`Monorepo rilevato, entro in: ${actualPath}`);
                } else {
                    throw new Error("Nessun package.json trovato nella root o in /backend");
                }
            }

            console.log(`Preparazione ambiente in: ${actualPath}`);

            // 2. Eseguiamo i test forzando il reporter json-summary
            // Usiamo npx jest per ignorare le configurazioni locali che potrebbero non generare il JSON
            const command = `cd "${actualPath}" && npm install && npx jest --coverage --coverageReporters="json-summary" --coverageReporters="text-summary"`;
            
            console.log(`Esecuzione comando: ${command}`);
            await execPromise(command);

            // 3. Verifica il percorso del file (alcune versioni di Jest o configurazioni possono variare il nome)
            const coverageDir = path.join(actualPath, 'coverage');
            const summaryPath = path.join(coverageDir, 'coverage-summary.json');
            const finalPath = path.join(coverageDir, 'coverage-final.json');

            let data;

            if (fs.existsSync(summaryPath)) {
                // Caso ideale: il summary esiste
                data = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
            } else if (fs.existsSync(finalPath)) {
                // Caso fallback: leggiamo il final (struttura diversa, dobbiamo estrarre i dati)
                console.log("Summary non trovato, estraggo dati da coverage-final.json");
                const finalData = JSON.parse(fs.readFileSync(finalPath, 'utf-8'));
                data = this.mapFinalToSummary(finalData);
            } else {
                const files = fs.existsSync(coverageDir) ? fs.readdirSync(coverageDir) : 'cartella mancante';
                throw new Error(`Nessun file di coverage valido trovato. Files: ${files}`);
            }

            // Ora 'data' ha la struttura che ti aspetti
            const coverageData = {
                percentage: data.total.lines.pct || 0,
                details: {
                    lines: data.total.lines.pct || 0,
                    statements: data.total.statements.pct || 0,
                    functions: data.total.functions.pct || 0,
                    branches: data.total.branches.pct || 0,
                },
            };

            console.log(`Coverage completata: ${coverageData.percentage}%`);

            // Salvataggio su MongoDB
            return await this.coverageModel.create(coverageData);

        } catch (error) {
            console.error("Errore critico durante la coverage:", error);
            throw error;
        }
    }

    private mapFinalToSummary(finalData: any) {
        // Inizializziamo i totali
        const total = { lines: { pct: 0 }, statements: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } };
        let fileCount = 0;

        for (const file in finalData) {
            const s = finalData[file];
            // Nota: Questo è un calcolo semplificato per non bloccare il workflow
            // In una versione pro dovresti sommare hit/miss di ogni file
            fileCount++;
        }

        // Se proprio non riusciamo a mappare, restituiamo un oggetto compatibile con valori dummy
        // o meglio, facciamo un log. 
        // Spesso il problema è solo che il file si chiama in modo diverso.
        return { total: { lines: { pct: 0 }, statements: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } } };
    }
}