import { NextRequest, NextResponse } from 'next/server';
import { uploadStockDocument } from '@/lib/imagekit';
import { analyzeBusinessData } from '@/lib/groq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const prompt = formData.get('prompt') as string;
    const analysisType = formData.get('analysisType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to ImageKit with 1 minute expiry
    const uploadResult = await uploadStockDocument(buffer, analysisType || 'analysis', 1);

    // Prepare prompt based on analysis type
    let aiPrompt = prompt || 'Analyze this business-related image and provide insights';

    if (analysisType === 'invoice') {
      aiPrompt = `Analyze this invoice image and extract:
1. Total amount
2. Date
3. Items purchased with quantities and prices
4. Vendor/Supplier information
5. Any payment details

${prompt || ''}`;
    } else if (analysisType === 'receipt') {
      aiPrompt = `Analyze this receipt image and extract:
1. Transaction date and time
2. Items purchased with quantities and prices
3. Subtotal, tax, and total amount
4. Payment method
5. Store/business information

${prompt || ''}`;
    } else if (analysisType === 'stock') {
      aiPrompt = `Analyze this stock/inventory image and identify:
1. Products or ingredients visible
2. Estimated quantities
3. Condition of items
4. Any expiration dates visible
5. Organization and storage recommendations

${prompt || ''}`;
    } else if (analysisType === 'product') {
      aiPrompt = `Analyze this product image and provide:
1. Product description
2. Visible condition and quality
3. Packaging details
4. Suggested category
5. Pricing recommendations based on appearance

${prompt || ''}`;
    }

    // Analyze with GROQ AI
    const analysis = await analyzeBusinessData({
      prompt: aiPrompt,
      imageUrl: uploadResult.url,
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      fileId: uploadResult.fileId,
      analysis,
      analysisType,
      expiryInfo: {
        expiresIn: '1 minute',
        message: 'Image will be automatically deleted after 1 minute to save storage',
      },
    });
  } catch (error: any) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process image',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check API status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Image analysis API is ready',
    supportedTypes: ['invoice', 'receipt', 'stock', 'product', 'general'],
  });
}

