import { NextResponse } from 'next/server';
import * as Papa from 'papaparse';

// Mock Data for Development (in case fetch fails or for testing)
const MOCK_SUMMARY = `Date,Video links,Vocab and 1st Homework,2nd Homework ,3rd Homework,1st Homework Submission ,2nd Homework Submission,3rd Homework Submission,Form ID,Reminder,Tracking ID
2025-12-20T00:57:46Z,video_url,doc_url,form_url,,Submitted,100,,form_id,,tracking_id
2026-01-15T01:01:32Z,video_url,doc_url,form_url,link,Submitted,89,61,form_id,Sent,tracking_id`;

// In-memory cache for GID lookups to avoid repeated HTML scraping
const gidCache = new Map<string, string>();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const sheetId = searchParams.get('sheetId') || '2PACX-1vSP_cjrodcmRgWgNHzP7JN7HT0p2S3VbDuuO1K9aBrrSDCMAvLIBfULhfmreRnVHFsppI484VBZayUG';
    const gidParam = searchParams.get('gid');
    const sheetName = searchParams.get('sheetName'); // e.g., 'Sheet2'
    let gid = gidParam || '0';
    let currentSheetId = sheetId;

    if (type === 'master') {
        currentSheetId = '2PACX-1vQLArGuzhY9PqWKBtwoMbVQwQdsr39Wgd0hDF9EX9nGhtL5ecwq7ZrIN5wlTzHJTtWt2N0Bl9zJJnMz';
    }

    // Auto-discovery of GID if sheetName is provided
    if (type === 'vocab' || sheetName) {
        const targetName = sheetName || 'Sheet2';
        const cacheKey = `${currentSheetId}-${targetName}`;

        // 1. Check in-memory cache first
        if (gidCache.has(cacheKey)) {
            gid = gidCache.get(cacheKey)!;
        }
        // 2. Fetch HTML if not in cache
        else {
            try {
                const htmlUrl = `https://docs.google.com/spreadsheets/d/e/${currentSheetId}/pubhtml`;
                const htmlRes = await fetch(htmlUrl, { next: { revalidate: 3600 } }); // Cache discovery for 1hr
                if (htmlRes.ok) {
                    const htmlText = await htmlRes.text();
                    // Regex to find: name: "Sheet2", ... gid: "123456"
                    const regex = new RegExp(`name:\\s*"${targetName}",[^]*?gid:\\s*"([0-9]+)"`, 'i');
                    const match = htmlText.match(regex);
                    if (match && match[1]) {
                        gid = match[1];
                        gidCache.set(cacheKey, gid);
                    }
                }
            } catch (e) {
                console.error("GID Discovery failed:", e);
            }
        }
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/e/${currentSheetId}/pub?gid=${gid}&single=true&output=csv`;

    try {
        const response = await fetch(csvUrl, { next: { revalidate: 60 } }); // Increased cache to 60s
        if (!response.ok) throw new Error('Failed to fetch CSV');
        const csvText = await response.text();

        const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return NextResponse.json({ data: result.data });
    } catch (error) {
        console.error('Sheets API Error:', error);
        // Return Mock Data if fetch fails (for robustness during dev)
        return NextResponse.json({
            data: Papa.parse(MOCK_SUMMARY, { header: true }).data,
            warning: 'Using Mock Data due to fetch failure'
        });
    }
}
