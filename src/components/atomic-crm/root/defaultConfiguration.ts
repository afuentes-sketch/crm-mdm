import type { ConfigurationContextValue } from "./ConfigurationContext";
// Import the logos as module assets so Vite resolves their URL relative to the
// JS chunk (import.meta.url), not the current route. A plain "./logos/..." path
// breaks on nested routes like /oauth/consent and under a deployment sub-path.
import darkModeLogo from "./logos/logo_atomic_crm_dark.svg";
import lightModeLogo from "./logos/logo_atomic_crm_light.svg";

export const defaultDarkModeLogo = darkModeLogo;
export const defaultLightModeLogo = lightModeLogo;

export const defaultCurrency = "USD";

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

export const defaultDealStages = [
  { value: "opportunity", label: "Oportunidad" },
  { value: "proposal-sent", label: "Propuesta enviada" },
  { value: "in-negociation", label: "En negociación" },
  { value: "won", label: "Ganada" },
  { value: "lost", label: "Perdida" },
  { value: "delayed", label: "Pospuesta" },
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
