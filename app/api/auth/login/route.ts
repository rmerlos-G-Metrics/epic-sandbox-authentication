/**
 * @author Ricardo Merlos Torres
 * @email rmerlos@g-metrics.com
 * @create date 2026-05-04 11:55:13
 * @modify date 2026-05-04 11:55:13
 * @desc [description]
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function GET() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  console.log(`Generated state: ${state}`);

  // FIX: Await the cookies() function
  const cookieStore = await cookies();
  cookieStore.set('epic_code_verifier', codeVerifier, { httpOnly: true, path: '/' });
  cookieStore.set('epic_state', state, { httpOnly: true, path: '/' });

  const authUrl = new URL('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize');
  
  
  authUrl.searchParams.append('client_id', process.env.EPIC_CLIENT_ID || ''); 
  authUrl.searchParams.append('scope', 'launch/patient openid fhirUser patient/Patient.read patient/Condition.read');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', 'https://localhost:3000/api/auth/callback'); 
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('aud', 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4');

  console.log('\n=== STEP 1: EPIC AUTHORIZATION URL ===');
  console.log(authUrl.toString());
  console.log('======================================\n');

  return NextResponse.redirect(authUrl.toString());
}