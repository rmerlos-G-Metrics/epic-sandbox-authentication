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
    // =======================================================================
    // STEP 1: EXTRACT URL PARAMETERS FROM EPIC'S REDIRECT
    // =======================================================================
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateReturned = searchParams.get('state');

    // =======================================================================
    // STEP 2: RETRIEVE SAVED COOKIES
    // =======================================================================
    const cookieStore = await cookies();
    const stateSaved = cookieStore.get('epic_state')?.value;
    const codeVerifier = cookieStore.get('epic_code_verifier')?.value;

    // =======================================================================
    // STEP 3: LOG & VERIFY STATE
    // =======================================================================
    console.log('\n=== CALLBACK RECEIVED ===');
    console.log('Code from Epic URL:', code);
    console.log('State from Epic URL:', stateReturned);
    console.log('State from Cookie:', stateSaved);
    console.log('=========================\n');

    if (!code || !stateReturned || !stateSaved || stateReturned !== stateSaved) {
        console.error('State mismatch or missing code/state.');
        return NextResponse.json({ error: 'Invalid state or missing code' }, { status: 400 });
    }

    // Prepare Token Request
    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'https://localhost:3000/api/auth/callback',
        code_verifier: codeVerifier || '',
    })

    const clientId = process.env.EPIC_CLIENT_ID;
    const clientSecret = process.env.EPIC_CLIENT_SECRET;

    // Confidential clients must authenticate using an Authorization header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
        },
        body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    // =======================================================================
    // STEP 5: LOG THE TOKEN ENDPOINT RESPONSE
    // =======================================================================
    console.log('\n=== TOKEN ENDPOINT RESPONSE ===');
    console.log(tokenData);
    console.log('===============================\n');

    if (!tokenResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch token', details: tokenData }, { status: 400 });
    }

    // Save the new access token and patient ID to cookies
    cookieStore.set('epic_access_token', tokenData.access_token, { httpOnly: true, path: '/' });
    cookieStore.set('epic_patient_id', tokenData.patient, { httpOnly: true, path: '/' });

    // Finally, redirect to your dashboard to view the data
    return NextResponse.redirect(new URL('/dashboard', request.url));
}