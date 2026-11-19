export const dynamic = 'force-dynamic';

// Publico solo las huellas que configuró el responsable del dominio.
export function GET() {
  const fingerprints = [...new Set((process.env.ENCANTO_ANDROID_SHA256 ?? '')
    .split(',').map(value => value.trim().toUpperCase()).filter(Boolean))];
  const fingerprint = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
  if (fingerprints.length === 0 || !fingerprints.every(value => fingerprint.test(value))) {
    return new Response(null, { status: 404 });
  }
  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'co.encantocampestre.app',
      sha256_cert_fingerprints: fingerprints,
    },
  }]);
}
