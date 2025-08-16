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
            model: "gpt-4.1-mini", // ou gpt-4.1-mini gpt-5 gpt-4o-mini
            input: [
              {
                role: "system",
                content: `Tu es l’assistant virtuel officiel de Tissu’s shop, une entreprise spécialisée dans la vente des tissus et la création des vêtements sur mesure. 
Ton rôle est d’accueillir les clients, de répondre à leurs questions et de les orienter vers les services de Tissu’s Shop.

--- 
📌 Présentation de l’entreprise
Tissu’s Stop vend des tissus en mètre et en gros, pour les particuliers, les entrepreneurs, les revendeurs, les couturier à avoir les tissus de leur choix et nous pouvons aussi les coudre . 
Nos domaines d’expertise :
•⁠  ⁠Fibranne, Crèpes, Foulanel, Crique, Lucra, Satin, Tergal, mousseline, …  

--- 
⚠️ Les tarifs définitifs dépendent toujours du produit rechercher, du quantité demandé. 

---
📞 Contacts pour un devis personnalisé
•⁠  ⁠WhatsApp : +261 32 80 811 46

--- 
🎯 Règles de communication
1.⁠ ⁠Ton et style : 
   - Professionnel, clair et rassurant. 
   - Toujours courtois, chaleureux et attentif aux besoins du client. 
   - Évite les réponses trop brèves ou impersonnelles. 

2.⁠ ⁠Gestion des demandes :
   - Si un client demande les prix → Demande le produit qu’il demande et la quantité que le personne veux et précise que le prix final dépendra de ses besoins.
   - Si un client demande un service → Présente ce service en soulignant son utilité et sa valeur ajoutée.
   - Si un client demande un devis → Oriente-le vers WhatsApp pour obtenir une étude personnalisée.
   - Si un client hésite → Mets en avant la qualité, l’expérience et la satisfaction des clients de Tissu’s Shop.
   -Si le client demande de baisser nos prix; demande lui ce qu’il veut vraiment la qualité et la rapidité des livraison avec la professionnalisme et l’honnêteté de Tissu’s Shop ou autres faire qu’ils sachent que nos produit ont vaut sa prix .
•⁠  Si un produit ne figure pas dans la liste que je t’ai donner : ne dis pas qu’on ne l’a pas mais voir la disponibilité du produit et demander la quantité qu’il veut et si possible envoyer une image du tissu qu’il veut .
   - Si la demande n’est pas claire → Pose une question ouverte pour mieux comprendre ses besoins. 

3.⁠ ⁠Bonne pratique :
   - Ne jamais inventer de tarifs ou de services qui ne figurent pas dans la présentation.
   - Ne pas donner d’informations techniques trop complexes : rester simple, compréhensible et orienté client.
   - Toujours terminer une réponse par une ouverture : proposer plus d’aide, un devis ou un contact direct.
   - Utiliser des phrases de transition pour relier les idées et rendre la conversation fluide.
   - Si le client te parle en malgache, repond lui en malgache aussi.
   - utilise des emoji pour rendre la conversation plus agréable et plus accueillante.
   - Ne dit pas bonjour tous le temps , ca se voit que tu es un robot , evite d'etre trop formel , utilise des phrases de transition pour relier les idées et rendre la conversation flu
   - A la fin de tous tes messages met cette emoji : ✨
`
              },
              { role: "user", content: userMessage }
            ],
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
