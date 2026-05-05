import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // 1. Await cookies() to retrieve the saved values
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('epic_access_token')?.value;
  const patientId = cookieStore.get('epic_patient_id')?.value;

  // Redirect if we are missing the necessary tokens
  if (!accessToken || !patientId) {
    console.warn("Missing access token or patient ID. Redirecting to home.");
    redirect('/'); 
  }

  // 2 & 3. Construct and authenticate the FHIR request
  const fhirBaseUrl = process.env.EPIC_FHIR_BASE || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
  const patientEndpoint = `${fhirBaseUrl}/Patient/${patientId}`;

  try {
    const fhirResponse = await fetch(patientEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Required for all FHIR queries[cite: 4]
        'Accept': 'application/json'
      },
      // Optionally add caching strategies based on your Next.js setup
      // cache: 'no-store' 
    });

    if (!fhirResponse.ok) {
      const errorText = await fhirResponse.text();
      console.error(`FHIR Request Failed: ${fhirResponse.status} ${fhirResponse.statusText}`, errorText);
      throw new Error(`Failed to fetch patient data: ${fhirResponse.status}`);
    }

    const patientData = await fhirResponse.json();

    // 4. Process the FHIR Patient resource to extract the name
    // FHIR names are typically arrays. We'll grab the first one (the "official" name).
    const nameData = patientData.name?.[0] || {};
    // Extract given (first/middle) names and join them, then add the family (last) name.
    const givenNames = nameData.given?.join(' ') || '';
    const familyName = nameData.family || '';
    const fullName = `${givenNames} ${familyName}`.trim() || 'Unknown Name';

    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Patient Dashboard</h1>
        
        <div style={{ background: '#f9f9f9', border: '1px solid #ddd', padding: '2rem', borderRadius: '8px', marginTop: '2rem' }}>
          <h2>{fullName}</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li><strong>FHIR ID:</strong> {patientId}</li>
            {/* You can add more fields here if you requested scopes like Condition.read */}
            <li><strong>Gender:</strong> {patientData.gender || 'Not specified'}</li>
            <li><strong>Birth Date:</strong> {patientData.birthDate || 'Not specified'}</li>
          </ul>
        </div>

        <details style={{ marginTop: '2rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw FHIR Data</summary>
          <pre style={{ background: '#eee', padding: '1rem', overflowX: 'auto', borderRadius: '4px', fontSize: '0.85rem' }}>
            {JSON.stringify(patientData, null, 2)}
          </pre>
        </details>

      </main>
    );

  } catch (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Error Loading Dashboard</h1>
        <p style={{ color: 'red' }}>There was a problem fetching the patient data.</p>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </main>
    );
  }
}