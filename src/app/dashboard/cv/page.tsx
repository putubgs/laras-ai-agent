import { getCVVersions } from "@/lib/actions/cv";
import CVManager from "@/components/dashboard/CVManager";
import { FileText } from "lucide-react";

export const metadata = { title: "My CVs – Laras" };

export default async function CVPage() {
  const cvs = await getCVVersions();

  return (
    <div className="laras-page max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <FileText className="h-5 w-5 text-primary-container" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">My CVs</h1>
            <p className="text-sm text-on-surface-variant">
              Upload and manage CV files linked to your applications.
            </p>
          </div>
        </div>
      </div>

      <CVManager initialCVs={cvs} />
    </div>
  );
}
