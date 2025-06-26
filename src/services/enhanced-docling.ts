// Enhanced Docling Service with OCR Support (100% Node.js)
import { DoclingService, ConversionResult, ProcessResult } from './docling';
import { createWorker, Worker } from 'tesseract.js';
import { promises as fs } from 'fs';
import path from 'path';

interface OCRResult {
  text: string;
  confidence: number;
  metadata: {
    imageCount: number;
    averageConfidence: number;
    processingTime: number;
    language: string;
  };
}

interface EnhancedConversionResult extends ConversionResult {
  ocrData?: OCRResult;
  hasImages?: boolean;
  imageProcessingEnabled?: boolean;
}

export class EnhancedDoclingService extends DoclingService {
  private ocrWorker: Worker | null = null;
  private ocrEnabled: boolean = true;
  private readonly supportedImageFormats = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'];

  constructor(ocrEnabled: boolean = true) {
    super();
    this.ocrEnabled = ocrEnabled;
  }

  /**
   * 🔍 Initialize OCR worker for image processing
   */
  private async initializeOCR(): Promise<Worker> {
    if (!this.ocrWorker) {
      console.log('🔍 Initializing Tesseract.js OCR worker...');
      this.ocrWorker = await createWorker('eng');
      console.log('✅ OCR worker initialized successfully');
    }
    return this.ocrWorker;
  }

  /**
   * 📄 Enhanced document conversion with OCR support
   */
  async convertDocumentWithOCR(filePath: string, format: string = 'markdown'): Promise<EnhancedConversionResult> {
    const startTime = Date.now();
    
    try {
      // First, try standard conversion
      const baseResult = await this.convertDocument(filePath, format);
      
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if this file type might contain images that need OCR
      const needsOCR = this.ocrEnabled && (
        ext === '.pdf' || 
        this.supportedImageFormats.includes(ext) ||
        baseResult.content.length < 100 // Very short content might indicate scan
      );
      
      if (!needsOCR) {
        return {
          ...baseResult,
          hasImages: false,
          imageProcessingEnabled: this.ocrEnabled
        };
      }

      // Perform OCR processing
      let ocrResult: OCRResult | undefined;
      
      if (this.supportedImageFormats.includes(ext)) {
        // Direct image OCR
        ocrResult = await this.processImageOCR(filePath);
      } else if (ext === '.pdf') {
        // PDF with potential images - try to extract and OCR
        ocrResult = await this.processPDFWithOCR(filePath);
      }

      // Combine OCR results with base content
      let enhancedContent = baseResult.content;
      
      if (ocrResult && ocrResult.text.trim().length > 0) {
        // If OCR found significant text, append it
        if (ocrResult.confidence > 70) {
          enhancedContent += `\n\n## 🔍 OCR Extracted Content\n\n${ocrResult.text}`;
        } else if (baseResult.content.length < 50) {
          // If base content is very short, use OCR as primary
          enhancedContent = ocrResult.text;
        }
      }

      const processingTime = Date.now() - startTime;
      
      return {
        ...baseResult,
        content: enhancedContent,
        ocrData: ocrResult,
        hasImages: true,
        imageProcessingEnabled: this.ocrEnabled,
                 metadata: {
           ...baseResult.metadata,
           words: this.countWordsEnhanced(enhancedContent),
           characters: enhancedContent.length
         }
      };

    } catch (error) {
      console.error('❌ Enhanced conversion failed:', error);
      
      // Fallback to base conversion
      const fallbackResult = await this.convertDocument(filePath, format);
      return {
        ...fallbackResult,
        hasImages: false,
        imageProcessingEnabled: this.ocrEnabled
      };
    }
  }

  /**
   * 🖼️ Process direct image file with OCR
   */
  private async processImageOCR(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const worker = await this.initializeOCR();
      
      console.log(`🔍 Running OCR on image: ${path.basename(imagePath)}`);
      
      const { data: { text, confidence } } = await worker.recognize(imagePath);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ OCR completed in ${processingTime}ms with ${confidence.toFixed(1)}% confidence`);
      
      return {
        text: text.trim(),
        confidence,
        metadata: {
          imageCount: 1,
          averageConfidence: confidence,
          processingTime,
          language: 'eng'
        }
      };
      
    } catch (error) {
      console.error('❌ Image OCR failed:', error);
      
      return {
        text: '',
        confidence: 0,
        metadata: {
          imageCount: 0,
          averageConfidence: 0,
          processingTime: Date.now() - startTime,
          language: 'eng'
        }
      };
    }
  }

  /**
   * 📄 Process PDF with potential image content
   */
  private async processPDFWithOCR(pdfPath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll use a simplified approach
      // In a full implementation, we'd convert PDF pages to images first
      // using pdf2pic or similar, then OCR each page
      
      console.log(`🔍 Checking PDF for image content: ${path.basename(pdfPath)}`);
      
      // This is a placeholder - in practice, you'd:
      // 1. Convert PDF pages to images using pdf2pic
      // 2. Run OCR on each image
      // 3. Combine results
      
      const processingTime = Date.now() - startTime;
      
      return {
        text: '', // No additional OCR text for now
        confidence: 0,
        metadata: {
          imageCount: 0,
          averageConfidence: 0,
          processingTime,
          language: 'eng'
        }
      };
      
    } catch (error) {
      console.error('❌ PDF OCR failed:', error);
      
      return {
        text: '',
        confidence: 0,
        metadata: {
          imageCount: 0,
          averageConfidence: 0,
          processingTime: Date.now() - startTime,
          language: 'eng'
        }
      };
    }
  }

  /**
   * 📊 Batch OCR processing for multiple images
   */
  async batchProcessImages(imagePaths: string[]): Promise<OCRResult[]> {
    console.log(`🔍 Starting batch OCR processing for ${imagePaths.length} images`);
    
    const results: OCRResult[] = [];
    
    for (const imagePath of imagePaths) {
      if (this.supportedImageFormats.includes(path.extname(imagePath).toLowerCase())) {
        const result = await this.processImageOCR(imagePath);
        results.push(result);
      }
    }
    
    console.log(`✅ Batch OCR completed: ${results.length} images processed`);
    
    return results;
  }

  /**
   * 📈 Get OCR performance statistics
   */
  getOCRStats(): {
    enabled: boolean;
    supportedFormats: string[];
    averageProcessingTime?: number;
    totalImagesProcessed?: number;
  } {
    return {
      enabled: this.ocrEnabled,
      supportedFormats: this.supportedImageFormats,
      // These would be tracked in a real implementation
      averageProcessingTime: undefined,
      totalImagesProcessed: undefined
    };
  }

  /**
   * 🔧 Configure OCR settings
   */
  async configureOCR(options: {
    language?: string;
    enabled?: boolean;
  }): Promise<void> {
    if (options.enabled !== undefined) {
      this.ocrEnabled = options.enabled;
    }
    
    if (options.language && this.ocrWorker) {
      // Reinitialize worker with new language
      await this.ocrWorker.terminate();
      this.ocrWorker = await createWorker(options.language);
    }
  }

  /**
   * 🧹 Cleanup OCR resources
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      console.log('🧹 Terminating OCR worker...');
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
      console.log('✅ OCR worker terminated');
    }
  }

  /**
   * 🔍 Smart content detection - determine if document likely needs OCR
   */
  private async detectImageContent(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    
    // Direct image files obviously need OCR
    if (this.supportedImageFormats.includes(ext)) {
      return true;
    }
    
    // For PDFs, check file size and content ratio
    if (ext === '.pdf') {
      try {
        const stats = await fs.stat(filePath);
        const fileSizeKB = stats.size / 1024;
        
        // Large PDFs with little extracted text might be scanned
        const baseResult = await this.convertDocument(filePath);
        const textDensity = baseResult.content.length / fileSizeKB;
        
        // If text density is very low, likely contains images
        return textDensity < 10;
        
      } catch (error) {
        console.warn('Failed to analyze PDF for image content:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * 📊 Enhanced processing with automatic OCR detection
   */
  async processDocumentSmart(filePath: string, options: {
    format?: string;
    generateTasks?: boolean;
    generateContext?: boolean;
    storyMapping?: boolean;
    autoOCR?: boolean;
  } = {}): Promise<ProcessResult & { ocrData?: OCRResult }> {
    const { autoOCR = true, ...baseOptions } = options;
    
    let conversionResult: EnhancedConversionResult;
    
    if (autoOCR && this.ocrEnabled) {
      const needsOCR = await this.detectImageContent(filePath);
      
      if (needsOCR) {
        conversionResult = await this.convertDocumentWithOCR(filePath, baseOptions.format);
      } else {
        const baseResult = await this.convertDocument(filePath, baseOptions.format);
        conversionResult = {
          ...baseResult,
          hasImages: false,
          imageProcessingEnabled: this.ocrEnabled
        };
      }
    } else {
      const baseResult = await this.convertDocument(filePath, baseOptions.format);
      conversionResult = {
        ...baseResult,
        hasImages: false,
        imageProcessingEnabled: this.ocrEnabled
      };
    }
    
    // Continue with base processing logic
    const baseResult = await super.processDocument(filePath, baseOptions);
    
    return {
      ...baseResult,
      ocrData: conversionResult.ocrData
    };
  }

  /**
   * 🔧 Helper method to count words
   */
  protected countWordsEnhanced(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
} 