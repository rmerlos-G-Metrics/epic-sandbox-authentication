/**
 * @author Ricardo Merlos Torres
 * @email rmerlos@g-metrics.com
 * @create date 2026-05-05 11:27:08
 * @modify date 2026-05-05 11:27:08
 * @desc [description]
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // 1. Get the URL parameters
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateReturned = searchParams.get('state');

  // 2. Get the cookies
  const cookieStore = await cookies();
  const stateSaved = cookieStore.get('epic_state')?.value;
  const codeVerifier = cookieStore.get('epic_code_verifier')?.value;

  console.log('\n=== 1. CALLBACK HIT (CHECK YOUR TERMINAL) ===');
  console.log('Code:', code ? 'Exists' : 'Missing');
  console.log('State Match:', stateReturned === stateSaved);

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }
  if (stateReturned !== stateSaved) {
    return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
  }

  // 3. Construct the body (NO client_id for Confidential Clients!)
  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code'); // Required[cite: 4]
  tokenParams.append('code', code); // Required[cite: 4]
  tokenParams.append('redirect_uri', 'http://localhost:3000/api/auth/callback'); // Required[cite: 4]
  
  if (codeVerifier) {
    tokenParams.append('code_verifier', codeVerifier); // Required if PKCE was used[cite: 4]
  }

  // 4. Construct the Basic Auth Header
  const clientId = process.env.NEXT_PUBLIC_EPIC_CLIENT_ID || '70fe610a-bf18-4e74-a672-16610db7d1a9';
  const clientSecret = process.env.EPIC_CLIENT_SECRET || ''; 
  
  // Create base64 encoded string: "client_id:client_secret"
  const authString = `${clientId}:${clientSecret}`;
  const authHeader = Buffer.from(authString).toString('base64');

  console.log('\n=== 2. SENDING TOKEN REQUEST ===');
  console.log('Body Params:', tokenParams.toString());

  try {
    // 5. Execute the fetch to Epic's token endpoint
    const tokenResponse = await fetch('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: tokenParams.toString(),
    });

    // Parse the response
    const tokenData = await tokenResponse.json();

    console.log('\n=== 3. EPIC RESPONSE ===');
    console.log('Status:', tokenResponse.status);
    console.log('Data:', tokenData);

    // If Epic rejected the request, print the exact reason to the browser screen
    if (!tokenResponse.ok) {
      return NextResponse.json({
        debug_message: "Epic rejected the token request. Look at 'epic_error' below.",
        epic_status: tokenResponse.status,
        epic_error: tokenData
      }, { status: tokenResponse.status });
    }

    // Save the new access token and patient ID to cookies
    cookieStore.set('epic_access_token', tokenData.access_token, { httpOnly: true, path: '/' });
    cookieStore.set('epic_patient_id', tokenData.patient, { httpOnly: true, path: '/' });

    // Finally, redirect to your dashboard to view the data
    return NextResponse.redirect(new URL('/dashboard', request.url));

    // Success! Let's temporarily print the tokens to the screen so you know it worked.
    return NextResponse.json({
      debug_message: "SUCCESS! We got the token.",
      access_token: tokenData.access_token,
      patient_id: tokenData.patient
    });

  } catch (error) {
    console.error('Fetch failed entirely:', error);
    return NextResponse.json({ error: 'Network request to Epic failed.' }, { status: 500 });
  }
}