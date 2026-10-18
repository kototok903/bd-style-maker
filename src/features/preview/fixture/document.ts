import bootstrap from "@/features/preview/fixture/bootstrap.js?raw";
import snapshotUrl from "@/features/preview/fixture/discord-snapshot.html?url";

let snapshot: Promise<string> | undefined;
export function loadFixture() {
  snapshot ??= fetch(snapshotUrl)
    .then((response) => {
      if (!response.ok)
        throw new Error("Discord preview snapshot could not be loaded.");
      return response.text();
    })
    .catch((error) => {
      snapshot = undefined;
      throw error;
    });
  return snapshot;
}

export function fixtureDocument(
  token: string,
  external: boolean,
  html: string,
): string {
  const sources = external ? "https:" : "";
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${token}'; style-src 'unsafe-inline' ${sources}; img-src data: ${sources}; font-src data: ${sources}; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"><style>[hidden]{display:none!important}html,body{margin:0;width:100%;height:100%}body[data-inspect=true],body[data-inspect=true] *{cursor:crosshair!important}</style>`;
  const script = `<script nonce="${token}">${bootstrap}</script>`;
  return html
    .replace("<!--BD_HEAD-->", head)
    .replace("<!--BD_SCRIPT-->", script);
}
