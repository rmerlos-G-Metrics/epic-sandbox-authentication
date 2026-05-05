import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // FIX: Await the cookies() function
  const cookieStore = await cookies();
  const token = cookieStore.get('epic_access_token')?.value;
  const patientId = cookieStore.get('epic_patient_id')?.value;

  if (!token || !patientId) {
    redirect('/'); 
  }

  const fhirResponse = await fetch(`https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/${patientId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  const patientData = await fhirResponse.json();
  const nameObj = patientData.name?.[0] || {};
  const fullName = `${nameObj.given?.join(' ')} ${nameObj.family}`;

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Patient Dashboard</h1>
      <div style={{ background: '#f4f4f4', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Patient Name: {fullName}</h2>
        <p><strong>FHIR ID:</strong> {patientId}</p>
        <p><strong>Birth Date:</strong> {patientData.birthDate}</p>
      </div>
    </main>
  );
}