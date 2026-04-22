"use client";
import { useState } from "react";
import { Input, Select, Textarea } from "@/components/ui/input";

// DEMO: questionnaire is hardcoded per categoryId. In prod, store in DB
// (a `service_questions` table) keyed by service id with a JSON schema.

interface Question {
  id: string;
  label: string;
  type: "text" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
}

const QUESTIONS: Record<string, Question[]> = {
  elec: [
    { id: "tipo", label: "Tipo de actuación", type: "select", options: ["Reparación", "Instalación nueva", "Revisión", "Urgencia"] },
    { id: "puntos", label: "Puntos a revisar", type: "text", placeholder: "Ej. 2 enchufes y cuadro" },
    { id: "acceso", label: "Acceso al cuadro", type: "select", options: ["Fácil", "Difícil", "No lo sé"] },
  ],
  font: [
    { id: "tipo", label: "Tipo de problema", type: "select", options: ["Avería", "Instalación", "Fuga", "Atasco"] },
    { id: "urgencia", label: "Urgencia", type: "select", options: ["Hoy mismo", "Esta semana", "Sin prisa"] },
    { id: "ubicacion", label: "Ubicación dentro de casa", type: "text", placeholder: "Ej. cocina" },
  ],
  pint: [
    { id: "metros", label: "Metros cuadrados aprox.", type: "text", placeholder: "Ej. 80" },
    { id: "estado", label: "Estado de la pared", type: "select", options: ["Buena", "Pequeñas grietas", "Mal estado"] },
    { id: "color", label: "Color deseado", type: "text", placeholder: "Ej. blanco satinado" },
  ],
  refo: [
    { id: "tipo", label: "Ámbito de la reforma", type: "select", options: ["Cocina", "Baño", "Salón", "Integral"] },
    { id: "metros", label: "Metros cuadrados aprox.", type: "text", placeholder: "Ej. 25" },
    { id: "plazos", label: "Plazos deseados", type: "select", options: ["Cuanto antes", "1 mes", "2-3 meses", "Sin prisa"] },
    { id: "extras", label: "Otras consideraciones", type: "textarea", placeholder: "Materiales preferidos, restricciones de obra…" },
  ],
  vendim: [
    { id: "hectareas", label: "Hectáreas", type: "text", placeholder: "Ej. 2" },
    { id: "ladera", label: "Tipo de viñedo", type: "select", options: ["Llano", "Ladera moderada", "Ladera abrupta"] },
    { id: "personas", label: "Cuadrilla deseada", type: "select", options: ["3-5 personas", "6-10 personas", "+10 personas"] },
    { id: "manuten", label: "¿Incluye manutención?", type: "select", options: ["Sí", "No"] },
  ],
  // default fallback
  default: [
    { id: "descripcion", label: "Describe brevemente lo que necesitas", type: "textarea", placeholder: "Cuanto más detalle, mejores propuestas recibirás." },
    { id: "urgencia", label: "Urgencia", type: "select", options: ["Hoy mismo", "Esta semana", "Sin prisa"] },
  ],
};

interface Props {
  categoryId: string;
  onChange?: (answers: Record<string, string>) => void;
}

export function ServiceQuestionnaire({ categoryId, onChange }: Props) {
  const questions = QUESTIONS[categoryId] || QUESTIONS.default;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const upd = (id: string, v: string) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => {
        if (q.type === "select") {
          return (
            <Select
              key={q.id}
              label={q.label}
              value={answers[q.id] ?? ""}
              onChange={(e) => upd(q.id, e.target.value)}
            >
              <option value="">Selecciona…</option>
              {q.options!.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          );
        }
        if (q.type === "textarea") {
          return (
            <Textarea
              key={q.id}
              label={q.label}
              value={answers[q.id] ?? ""}
              onChange={(e) => upd(q.id, e.target.value)}
              placeholder={q.placeholder}
            />
          );
        }
        return (
          <Input
            key={q.id}
            label={q.label}
            value={answers[q.id] ?? ""}
            onChange={(e) => upd(q.id, e.target.value)}
            placeholder={q.placeholder}
          />
        );
      })}
    </div>
  );
}
