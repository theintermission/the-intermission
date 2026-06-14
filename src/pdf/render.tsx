import { renderToBuffer } from "@react-pdf/renderer";
import { BriefingDocument, type BriefingDocumentProps } from "./template";

/**
 * Renders a briefing to a PDF buffer.
 * Returns a Buffer ready to be attached to email or uploaded to storage.
 */
export async function renderBriefingPdf(props: BriefingDocumentProps): Promise<Buffer> {
  return renderToBuffer(<BriefingDocument {...props} />);
}
