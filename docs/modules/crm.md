# CRM Module

The CRM (Customer Relationship Management) module manages the business's interaction with its clients and providers.

## 👥 Client Management

The system handles a diverse set of clients, distinguished by their type (Retail, Wholesale, Reseller, Institution).

### Key Features:
- **Provider Flag**: Clients can be marked as `is_supplier`, allowing them to appear in the supplier management lists without needing a separate table.
- **Account Movements**: Tracks payments and debts per client, integrating with the Treasury module.

## 🤖 AI Client Analysis

The CRM leverages Google Gemini AI to provide "Intelligent Analysis" of clients.
- **Data Input**: The system sends the client's interaction history and purchase patterns to the AI.
- **Output**: Gemini returns personalized recommendations on how to approach the client or what products to offer based on their history.

## 📱 Omnichannel Inbox

A centralized communication hub that tracks interactions across different channels.
- **WhatsApp Integration**: via a Cloudflare Worker webhook, all inbound WhatsApp messages are automatically logged as `customer_interactions`.
- **Contextual View**: The inbox allows the user to see the full conversation history of a client before responding.

## 🛠 Technical Implementation
- **Store**: `useCrmStore` manages the list of clients and their movements.
- **Services**: `messagingService.ts` handles the formatting and dispatching of messages to external platforms.
