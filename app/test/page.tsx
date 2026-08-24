import type { Metadata } from "next";
import AccessForm from "./access-form";

export const metadata: Metadata = {
  title: "Test Access | Year 8 Digital Technologies",
  description: "Enter your student name and access code to begin the test.",
};

export default function TestAccessPage() {
  return <AccessForm />;
}
