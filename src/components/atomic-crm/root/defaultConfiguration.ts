import type { ConfigurationContextValue } from "./ConfigurationContext";
// Import the logos as module assets so Vite resolves their URL relative to the
// JS chunk (import.meta.url), not the current route. A plain "./logos/..." path
// breaks on nested routes like /oauth/consent and under a deployment sub-path.
import darkModeLogo from "./logos/logo_atomic_crm_dark.svg";
import lightModeLogo from "./logos/logo_atomic_crm_light.svg";

export const defaultDarkModeLogo = darkModeLogo;
export const defaultLightModeLogo = lightModeLogo;

export const defaultCurrency = "MXN";

export const defaultTitle = "Atomic CRM";

// Labels are shown to users and are in Spanish (the app's default language).
// Values are stored in the database and must stay stable.
export const defaultCompanySectors = [
  { value: "communication-services", label: "Servicios de comunicación" },
  { value: "consumer-discretionary", label: "Consumo discrecional" },
  { value: "consumer-staples", label: "Consumo básico" },
  { value: "energy", label: "Energía" },
  { value: "financials", label: "Finanzas" },
  { value: "health-care", label: "Salud" },
  { value: "industrials", label: "Industrial" },
  { value: "information-technology", label: "Tecnologías de la información" },
  { value: "materials", label: "Materiales" },
  { value: "real-estate", label: "Bienes raíces" },
  { value: "utilities", label: "Servicios públicos" },
];

// Sales statuses agreed with MDM. "pending-review", "paused", "won" and "lost"
// carry follow-up rules (see followup/followUpRules.ts): keep their values.
export const defaultDealStages = [
  { value: "new", label: "Nuevo" },
  { value: "gathering-info", label: "Recopilando información" },
  { value: "pending-quote", label: "Pendiente de cotización por Andrés" },
  { value: "quote-ready", label: "Cotización lista para enviar" },
  { value: "quote-sent", label: "Cotización enviada" },
  { value: "negotiation", label: "En seguimiento / negociación" },
  { value: "pending-review", label: "Pendiente de revisión con Andrés" },
  { value: "paused", label: "En pausa" },
  { value: "won", label: "Ganada: orden de compra recibida" },
  { value: "lost", label: "Perdida" },
];

export const defaultDealPipelineStatuses = ["won"];

export const defaultDealCategories = [
  { value: "other", label: "Otro" },
  { value: "copywriting", label: "Redacción" },
  { value: "print-project", label: "Proyecto de impresión" },
  { value: "ui-design", label: "Diseño de interfaces" },
  { value: "website-design", label: "Diseño web" },
];

export const defaultNoteStatuses = [
  { value: "cold", label: "Frío", color: "#7dbde8" },
  { value: "warm", label: "Tibio", color: "#e8cb7d" },
  { value: "hot", label: "Caliente", color: "#e88b7d" },
  { value: "in-contract", label: "En contrato", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Ninguno" },
  { value: "email", label: "Correo" },
  { value: "demo", label: "Demostración" },
  { value: "lunch", label: "Comida" },
  { value: "meeting", label: "Reunión" },
  { value: "follow-up", label: "Seguimiento" },
  { value: "thank-you", label: "Agradecimiento" },
  { value: "ship", label: "Envío" },
  { value: "call", label: "Llamada" },
];

export const defaultConfiguration: ConfigurationContextValue = {
  companySectors: defaultCompanySectors,
  currency: defaultCurrency,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};
