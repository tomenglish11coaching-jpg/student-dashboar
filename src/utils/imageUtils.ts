/**
 * Convert Google Drive sharing links to direct image URLs
 * @param url - The URL to convert (can be Google Drive link, direct URL, or empty)
 * @returns Direct image URL or original URL
 */
export function convertToDirectImageUrl(url: string | null | undefined): string | null {
    if (!url || url.trim() === '') return null;

    const trimmedUrl = url.trim();

    // Try to extract File ID using multiple patterns
    // 1. /file/d/FILE_ID/view or /file/v/FILE_ID/view
    const fileDMatch = trimmedUrl.match(/\/file\/v\/([a-zA-Z0-9_-]+)/) || trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    // 2. id=FILE_ID
    const idMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    const fileId = (fileDMatch && fileDMatch[1]) || (idMatch && idMatch[1]);

    if (fileId) {
        // This endpoint is generally more reliable for direct <img> loading
        return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }

    // Return original URL if it's not a recognized Google Drive link
    return trimmedUrl;
}
