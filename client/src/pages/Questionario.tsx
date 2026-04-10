/*
 * Questionario — Public standalone page for COPSOQ II questionnaire
 * Accessible via /questionario without needing to access the full dashboard
 */

import CopsoqForm from "@/components/CopsoqForm";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function Questionario() {
  return (
    <ThemeProvider defaultTheme="light">
      <CopsoqForm standalone />
    </ThemeProvider>
  );
}
