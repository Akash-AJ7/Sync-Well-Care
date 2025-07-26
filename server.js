import fs from 'fs';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import axios from 'axios';
import User from './models/User.js';
import Task from './models/Task.js';

// Load environment variables from .env file
const dotenvPath = path.resolve('.env');
if (fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
} else {
    console.error('.env file not found');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;
const hostname = '127.0.0.1';

// Serve static files from the 'assets' folder
app.use(express.static(path.join(__dirname, 'assets')));

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.listen(port, hostname, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
});

// Middleware to parse cookies, JSON, and URL-encoded data
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.DB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Middleware to check if user is authenticated
const checkAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.redirect('/login');
    }
};

// Generate personalized recommendations based on disease information
async function generateRecommendations(diseaseInfo) {
    if (!diseaseInfo) {
        return 'No information available for this disease.';
    }

    let recommendations = `Diet: ${diseaseInfo.snippet}`;
    recommendations += `\nExercise: Regular physical activity is recommended.`;
    recommendations += `\nLifestyle: Maintain a healthy weight and monitor your health regularly.`;

    return recommendations;
}

// Define the function to get disease information
async function getDiseaseInfo(diseaseName) {
    const diseaseInfo = {
        Fever: {
            snippet: "Fever is often caused by an infection or illness.",
            treatment: "Rest and hydration. Consider taking fever-reducing medications."
        },
        "Blood Pressure": {
            snippet: "Blood pressure measures the force of blood against artery walls.",
            treatment: "Regular monitoring, lifestyle changes, and medication may be necessary."
        },
        Glucose: {
            snippet: "Glucose levels need to be monitored for diabetes management.",
            treatment: "Healthy eating and regular exercise. Medications may be required."
        }
    };

    return diseaseInfo[diseaseName] || { snippet: 'No information available for this disease.' };
}

// Redirect root path to login if not authenticated
app.get('/', (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        req.userId = decoded.userId;
        return res.redirect('/tasks');
    } catch (err) {
        return res.redirect('/login');
    }
});

// Serve HTML files
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Protect task routes with authentication middleware
app.get('/tasks', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API route to fetch tasks for the authenticated user
app.get('/api/tasks', checkAuthenticated, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).send('Error fetching tasks');
    }
});

// Handle registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Registration request body:', req.body);

        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        console.log('User registered successfully:', username);
        res.redirect('/login');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user');
    }
});

// Handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Login request body:', req.body);

        if (!username || !password) {
            console.log('Username and password are required');
            return res.status(401).send('Invalid credentials');
        }

        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).send('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', username);
            return res.status(401).send('Invalid credentials');
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        console.log('User logged in successfully:', username);
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Error during login');
    }
});

// Handle task creation
app.post('/tasks', checkAuthenticated, async (req, res) => {
    const { taskName, taskTime, nomineePhone, diseaseName, diseaseValue } = req.body;

    if (!taskName || !taskTime || !nomineePhone) {
        return res.status(400).json({ error: 'taskName, taskTime, and nomineePhone are required fields.' });
    }

    const diseaseUnitMapping = {
        "Fever": "°C",
        "Blood Pressure": "mmHg",
        "Glucose": "mg/dL"
    };

    const unit = diseaseUnitMapping[diseaseName] || "";
    const taskDetails = { taskName, taskTime, nomineePhone, userId: req.userId, diseaseName, diseaseValue, unit };

    try {
        let recommendations = '';

        if (diseaseName && diseaseValue) {
            const diseaseInfo = await getDiseaseInfo(diseaseName);
            recommendations = await generateRecommendations(diseaseInfo);
        }

        const task = new Task({ ...taskDetails, recommendations });
        await task.save();
        res.json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).send('Error creating task');
    }
});

// Handle task deletion
app.delete('/tasks/:id', checkAuthenticated, async (req, res) => {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
    }

    try {
        const result = await Task.deleteOne({ _id: taskId, userId: req.userId });

        if (result.deletedCount > 0) {
            return res.status(200).json({ message: 'Task deleted successfully!' });
        } else {
            return res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        return res.status(500).json({ error: 'Error deleting task' });
    }
});

// Mark task as complete and send SMS notification
app.post('/tasks/:id/complete', checkAuthenticated, async (req, res) => {
    const taskId = req.params.id;

    try {
        const task = await Task.findOne({ _id: taskId, userId: req.userId });

        if (!task) {
            console.error('Task not found:', taskId);
            return res.status(404).send('Task not found');
        }

        task.isComplete = true;
        await task.save();

        const messageBody = `Task "${task.taskName}" has been completed. Disease: ${task.diseaseName || 'N/A'}, Value: ${task.diseaseValue || 'N/A'}`;

        client.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: task.nomineePhone
        })
            .then(message => {
                console.log('SMS sent successfully:', message.sid);
                res.status(200).send('Task marked as complete and notification sent!');
            })
            .catch(error => {
                console.error('Error sending SMS:', error);
                res.status(500).send('Task marked as complete but failed to send SMS');
            });

    } catch (error) {
        console.error('Error marking task as complete:', error);
        res.status(500).send('Error marking task as complete');
    }
});

export default app;
