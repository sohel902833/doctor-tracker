import { createElement } from "react";
import { pdfFileName, type PrescriptionData } from "./prescription";

/**
 * Builds the PDF in the browser and downloads it. The PDF library is
 * imported on click, so it isn't part of the page's initial JavaScript.
 */
export const downloadPrescriptionPdf = async (data: PrescriptionData) => {
  const [{ pdf }, { PrescriptionPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./components/prescription-pdf"),
  ]);

  // pdf() expects a <Document> element; PrescriptionPdf renders one.
  const element = createElement(PrescriptionPdf, { data }) as unknown as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFileName(data);
  link.click();
  URL.revokeObjectURL(url);
};
