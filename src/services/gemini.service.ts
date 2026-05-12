import Groq from 'groq-sdk';

export interface UserSunProfile {
  sunExposure?: string;       // e.g. "Less than 30 minutes"
  sunscreenUse?: string;      // e.g. "Once a day"
  outdoorFrequency?: string;  // e.g. "3 days a week"
  lastSunburn?: string;       // e.g. "A week ago"
}

export interface GeminiContext {
  features: {
    spotCount: number;
    textureScore: number;
    averagePigmentation: number;
  };
  baseline: {
    spotCount: number;
    textureScore: number;
    averagePigmentation: number;
  } | null;
  ruleStatus: string;
  ruleAdvice: string;
  damageScore?: number;
  damageLevel?: string;
  damageAdvice?: string;
  bodyArea?: string;
  userProfile?: UserSunProfile;
}

let groq: Groq | null = null;

function getClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

function buildPrompt(ctx: GeminiContext): string {
  const { features, baseline, ruleStatus, ruleAdvice, damageScore, damageLevel, damageAdvice, bodyArea, userProfile } = ctx;

  const baselineSection = baseline
    ? `Longitudinal comparison (vs first scan):
- Spot count: ${features.spotCount} vs baseline ${baseline.spotCount} (${features.spotCount - baseline.spotCount >= 0 ? '+' : ''}${features.spotCount - baseline.spotCount} spots, ${(((features.spotCount - baseline.spotCount) / Math.max(baseline.spotCount, 1)) * 100).toFixed(1)}%)
- Texture: ${features.textureScore.toFixed(3)} vs baseline ${baseline.textureScore.toFixed(3)} (${(features.textureScore - baseline.textureScore) >= 0 ? '+' : ''}${(features.textureScore - baseline.textureScore).toFixed(3)})
- Pigmentation: ${features.averagePigmentation.toFixed(3)} vs baseline ${baseline.averagePigmentation.toFixed(3)} (${(features.averagePigmentation - baseline.averagePigmentation) >= 0 ? '+' : ''}${(features.averagePigmentation - baseline.averagePigmentation).toFixed(3)})`
    : 'No baseline yet — this is the first scan for this body area.';

  const damageSection = damageScore !== undefined && damageLevel
    ? `UV damage assessment: ${damageLevel} (score ${damageScore.toFixed(2)}/1.00)`
    : '';

  const profileSection = userProfile && (userProfile.sunExposure || userProfile.sunscreenUse || userProfile.outdoorFrequency || userProfile.lastSunburn)
    ? `User sun & lifestyle profile:
${userProfile.sunExposure ? `- Daily sun exposure: ${userProfile.sunExposure}` : ''}
${userProfile.sunscreenUse ? `- Sunscreen use: ${userProfile.sunscreenUse}` : ''}
${userProfile.outdoorFrequency ? `- Goes outdoors: ${userProfile.outdoorFrequency}` : ''}
${userProfile.lastSunburn ? `- Last sunburn: ${userProfile.lastSunburn}` : ''}`.trim()
    : '';

  return `You are a skincare AI advisor. Your job is to take the outputs of a rule-based skin analysis system and produce a single, cohesive, personalized recommendation for the user. Blend all the rule outputs together — do not just repeat them. Be concise (3–4 sentences, under 100 words), friendly, and actionable. Do NOT diagnose.

=== ANALYSIS RESULTS FOR: ${bodyArea || 'skin'} ===

Measured metrics:
- Spot count: ${features.spotCount}
- Texture score: ${features.textureScore.toFixed(3)} (0 = smooth, 1 = rough)
- Pigmentation: ${features.averagePigmentation.toFixed(3)} (0 = light, 1 = dark)

${baselineSection}

Rule-based status: ${ruleStatus}
Rule-based advice: ${ruleAdvice}

${damageSection}
${damageAdvice ? `Knowledge base advice: ${damageAdvice}` : ''}
${profileSection ? `\n${profileSection}` : ''}
=== YOUR TASK ===
Using all the above context — including the user's sun exposure habits — write a single personalized recommendation that blends the longitudinal trend, the UV damage level, the rule-based findings, and the user's lifestyle into one clear, actionable message for this user.`;
}

export async function getGeminiRecommendation(ctx: GeminiContext): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
      max_tokens: 150,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error('  Groq recommendation failed:', error);
    return null;
  }
}
