import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
import { verifyAdmin } from '../controllers/adminController.js'; 

// We keep a simple in-memory tracker for the scraper job
let currentJob = null;

const LEAD_SYSTEM_DIR = path.join(__dirname, '..', '..', 'lead_system');

router.post('/start', verifyAdmin, (req, res) => {
    if (currentJob && currentJob.status === 'running') {
        return res.status(400).json({ success: false, message: 'A scraping job is already running' });
    }

    const { cities, keywords } = req.body;
    
    let args = ['main.py'];
    if (cities && cities.length > 0) {
        args.push('--city', cities.join(','));
    }
    if (keywords && keywords.length > 0) {
        args.push('--keyword', keywords.join(','));
    }

    currentJob = {
        status: 'running',
        startTime: new Date(),
        logs: [],
        error: null
    };

    // Make sure output/logs folders exist
    if (!fs.existsSync(path.join(LEAD_SYSTEM_DIR, 'output'))) fs.mkdirSync(path.join(LEAD_SYSTEM_DIR, 'output'));
    if (!fs.existsSync(path.join(LEAD_SYSTEM_DIR, 'logs'))) fs.mkdirSync(path.join(LEAD_SYSTEM_DIR, 'logs'));

    const pythonProcess = spawn('python', args, { cwd: LEAD_SYSTEM_DIR });

    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim() !== '');
        currentJob.logs.push(...lines);
    });

    pythonProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim() !== '');
        currentJob.logs.push(...lines);
    });

    pythonProcess.on('close', (code) => {
        currentJob.status = code === 0 ? 'completed' : 'failed';
        currentJob.endTime = new Date();
    });

    res.json({ success: true, message: 'Scraping job started', job: currentJob });
});

router.get('/status', verifyAdmin, (req, res) => {
    if (!currentJob) {
        return res.json({ success: true, job: null });
    }
    res.json({ success: true, job: currentJob });
});

router.get('/download/:type', verifyAdmin, (req, res) => {
    const { type } = req.params;
    const validTypes = ['xlsx', 'csv', 'json'];
    
    if (!validTypes.includes(type)) {
        return res.status(400).send('Invalid file type');
    }
    
    const filePath = path.join(LEAD_SYSTEM_DIR, 'output', `agencies.${type}`);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found or job not finished');
    }
});

export default router;
