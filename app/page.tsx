/**
 * @author Ricardo Merlos Torres
 * @email rmerlos@g-metrics.com
 * @create date 2026-05-04 11:54:59
 * @modify date 2026-05-04 11:54:59
 * @desc [description]
 */


export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Epic SMART on FHIR - Sandbox</h1>
      <a 
        href="/api/auth/login" 
        style={{ padding: '10px 20px', background: '#D22630', color: 'white', textDecoration: 'none', borderRadius: '5px', 'marginTop': '20px', display: 'inline-block' }}
      >
        Login with Epic
      </a>
    </main>
  );
}