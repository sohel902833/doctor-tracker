"use client";

import { Download, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadPrescriptionPdf } from "../download-pdf";
import type { PrescriptionData } from "../prescription";

/** Print (only #print-area is printed, see globals.css) and PDF download. */
export function PrescriptionActions({ data }: { data: PrescriptionData }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPrescriptionPdf(data);
    } catch {
      toast.error("Could not create the PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
      <Button variant="outline" onClick={download} disabled={downloading}>
        {downloading ? <Loader2 className="animate-spin" /> : <Download />} Download PDF
      </Button>
    </div>
  );
}
