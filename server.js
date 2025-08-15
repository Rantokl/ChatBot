import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";
import request from "request";

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static("public")); // Sert les fichiers HTML/CSS/JS

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN; // Token pour vérifier le webhook
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN; // Token de la page Facebook

// Client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API pour discuter avec l'IA
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini", // ou gpt-4.1-mini gpt-5 gpt-4o-mini
      input: userMessage,
    });

    res.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur avec l'API OpenAI" });
  }
});

app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
  
    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook vérifié ✅");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
      //Test
    }
  });
  
  // Réception des messages envoyés à la page
  app.post("/webhook", async (req, res) => {
    const body = req.body;
  
    if (body.object === "page") {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const senderId = webhookEvent.sender.id;
  
        if (webhookEvent.message && webhookEvent.message.text) {
          const userMessage = webhookEvent.message.text;
  
          // Générer réponse avec GPT
          const gptResponse = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: userMessage,
          });
  
          sendMessage(senderId, gptResponse.output_text);
        }
      }
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  });
  
  // Fonction pour envoyer un message via l'API Messenger
  function sendMessage(senderId, text) {
    const requestBody = {
      recipient: { id: senderId },
      message: { text },
    };
  
    request(
      {
        uri: "https://graph.facebook.com/v17.0/me/messages",
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: "POST",
        json: requestBody,
      },
      (err) => {
        if (!err) {
          console.log("Message envoyé à", senderId);
        } else {
          console.error("Erreur envoi :", err);
        }
      }
    );
  }

app.listen(port, () => {
  console.log(`🚀 Serveur chatbot lancé sur http://localhost:${port}`);
});
