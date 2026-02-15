import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi } from '../services/api';
import { useReceiptStore } from '../store/receiptStore';
import { VerifyOCRModal } from '../components/VerifyOCRModal';
import {
  Upload as UploadIcon,
  File,
  X,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Camera,
  
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Upload: React.FC = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = React.useState(0);
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [pendingOCRData, setPendingOCRData] = React.useState<{
    storeName: string;
    date: string;
    totalAmount: number;
    taxAmount: number;
    items: Array<{ name: string; quantity: number; price: number; total: number; category?: string }>;
    ocrStatus: string;
    ocrMessage?: string;
    imageUrl: string;
    receiptId: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { setIsUploading, setUploadProgress } = useReceiptStore();

  // Upload batch mutation - extracts OCR data and shows modal
  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const response = await receiptApi.uploadBatch(filesToUpload);
      return response;
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(0);
    },
    onSuccess: (uploadedFiles) => {
      console.log('[UPLOAD] onSuccess called with:', uploadedFiles);
      // If we have OCR data from the first file, show verification modal
      if (uploadedFiles && uploadedFiles.length > 0) {
        const firstFile = uploadedFiles[0] as unknown as Record<string, unknown>;
        console.log('[UPLOAD] First file:', firstFile);
        console.log('[UPLOAD] Has ocrData?', 'ocrData' in firstFile, firstFile.ocrData);
        if (firstFile && typeof firstFile === 'object' && 'ocrData' in firstFile && firstFile.ocrData) {
          const ocrData = firstFile.ocrData as Record<string, unknown>;
          console.log('[UPLOAD] OCR Data:', ocrData);
          setPendingOCRData({
            storeName: (ocrData.storeName as string) || '',
            date: (ocrData.date as string) || new Date().toISOString().split('T')[0],
            totalAmount: (ocrData.totalAmount as number) || 0,
            taxAmount: (ocrData.taxAmount as number) || 0,
            items: (ocrData.items as Array<{ name: string; quantity: number; price: number; total: number }>) || [],
            ocrStatus: (ocrData.ocrStatus as string) || 'success',
            ocrMessage: (ocrData.ocrMessage as string) || '',
            imageUrl: (firstFile.imageUrl as string) || '',
            receiptId: (firstFile.id as string) || '',
          });
          setVerifyModalOpen(true);
          setUploadedCount(uploadedFiles.length);
        } else {
          console.log('[UPLOAD] No ocrData found, showing success toast');
          toast.success(`Successfully uploaded ${uploadedFiles.length} receipts!`);
          queryClient.invalidateQueries({ queryKey: ['receipts'] });
          queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
          setFiles([]);
          setUploadedCount(uploadedFiles.length);
        }
      }
      setIsUploading(false);
    },
    onError: () => {
      toast.error('Failed to upload receipts');
      setIsUploading(false);
    },
  });

  // Verify and save mutation - saves verified data to MongoDB
  const verifyMutation = useMutation({
    mutationFn: async (verifiedData: {
      storeName: string;
      date: string;
      totalAmount: number;
      taxAmount: number;
      items: Array<{ name: string; quantity: number; price: number; total: number; category?: string }>;
      ocrStatus?: string;
      imageUrl?: string;
    }) => {
      console.log('[Frontend] Verifying OCR receipt with data:', verifiedData);
      console.log('[Frontend] Items being sent:', JSON.stringify(verifiedData.items, null, 2));
      const response = await receiptApi.verifyOCRReceipt(verifiedData);
      console.log('[Frontend] Verify response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('Receipt verified and saved to database successfully!');
      setVerifyModalOpen(false);
      setFiles([]);
      setPendingOCRData(null);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      setUploadedCount(1);
    },
    onError: () => {
      toast.error('Failed to verify and save receipt');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setUploadedCount(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    // Upload files - this will extract OCR and show modal
    uploadMutation.mutate(files);
  };

  const handleVerifyOCR = (verifiedData: {
    storeName: string;
    date: string;
    totalAmount: number;
    taxAmount: number;
    items: Array<{ name: string; quantity: number; price: number; total: number; category?: string }>;
    ocrStatus?: string;
  }) => {
    // Send verified data to backend to save to MongoDB
    verifyMutation.mutate(verifiedData);
  };

  const handleCancelVerify = () => {
    setVerifyModalOpen(false);
    setPendingOCRData(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-ios-blue" />;
    }
    return <FileText className="w-5 h-5 text-ios-red" />;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-ios-3xl font-bold text-ios-gray-900">Upload Receipts</h1>
          <p className="text-sm md:text-ios-base text-ios-gray-500 mt-1">
            Upload single or multiple receipt images for processing
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Drop Zone */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 md:p-5 rounded-ios-lg">
            <div
              {...getRootProps()}
              className={cn(
                'relative cursor-pointer rounded-ios-lg border-2 border-dashed p-4 md:p-6 text-center transition-all duration-300',
                isDragActive
                  ? 'border-ios-blue bg-ios-blue/5 scale-[1.02]'
                  : 'border-ios-gray-300 hover:border-ios-blue/50 hover:bg-ios-gray-50'
              )}
            >
              <input {...getInputProps()} />
              
              {/* Icon */}
              <div className={cn(
                'mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4 transition-all duration-300',
                isDragActive ? 'bg-ios-blue/10 scale-110' : 'bg-ios-gray-100'
              )}>
                <UploadIcon
                  className={cn(
                    'w-6 h-6 md:w-8 md:h-8 transition-colors',
                    isDragActive ? 'text-ios-blue' : 'text-ios-gray-400'
                  )}
                />
              </div>

              {/* Text */}
              {isDragActive ? (
                <>
                  <p className="text-sm md:text-base font-semibold text-ios-blue mb-1">
                    Drop files here to upload
                  </p>
                  <p className="text-xs md:text-sm text-ios-gray-500">
                    Release to start processing
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm md:text-base font-semibold text-ios-gray-900 mb-2">
                    Drag and drop receipt images
                  </p>
                  <p className="text-xs md:text-sm text-ios-gray-500 mb-3 md:mb-4">
                    or click to browse from your device
                  </p>
                  <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                    <div className="ios-badge bg-ios-blue/10 text-ios-blue text-[10px] md:text-xs">
                      PNG, JPG
                    </div>
                    <div className="ios-badge bg-ios-green/10 text-ios-green text-[10px] md:text-xs">
                      PDF
                    </div>
                    <div className="ios-badge bg-ios-purple/10 text-ios-purple text-[10px] md:text-xs">
                      Multiple
                    </div>
                  </div>
                </>
              )}

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-ios-blue/5 animate-pulse" />
              <div className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-ios-green/5 animate-pulse delay-75" />
            </div>

            {/* Quick Actions */}
            <div className="mt-4 md:mt-6 grid grid-cols-2 gap-3 md:gap-4">
              <button className="flex items-center justify-center gap-2 p-3 md:p-4 bg-ios-gray-100 rounded-ios text-ios-gray-900 hover:bg-ios-gray-200 transition-colors active-scale">
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-ios-base font-medium">Take Photo</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-3 md:p-4 bg-ios-gray-100 rounded-ios text-ios-gray-900 hover:bg-ios-gray-200 transition-colors active-scale">
                <File className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-ios-base font-medium">Choose Files</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Tips */}
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <h3 className="text-base md:text-ios-lg font-semibold text-ios-gray-900 mb-3 md:mb-4">
            Upload Tips
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ios-blue/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-ios-blue" />
              </div>
              <div>
                <p className="text-ios-sm font-medium text-ios-gray-900">Clear Images</p>
                <p className="text-ios-xs text-ios-gray-500 mt-1">
                  Ensure text is readable and not blurry
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ios-green/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-ios-green" />
              </div>
              <div>
                <p className="text-ios-sm font-medium text-ios-gray-900">Good Lighting</p>
                <p className="text-ios-xs text-ios-gray-500 mt-1">
                  Avoid shadows and glare on receipt
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ios-orange/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-ios-orange" />
              </div>
              <div>
                <p className="text-ios-sm font-medium text-ios-gray-900">Full Receipt</p>
                <p className="text-ios-xs text-ios-gray-500 mt-1">
                  Capture entire receipt from top to bottom
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ios-purple/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-ios-purple" />
              </div>
              <div>
                <p className="text-ios-sm font-medium text-ios-gray-900">Straight Angle</p>
                <p className="text-ios-xs text-ios-gray-500 mt-1">
                  Hold camera directly above receipt
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="glass-card p-6 rounded-ios-lg animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-ios-lg font-semibold text-ios-gray-900">
                Selected Files
              </h3>
              <p className="text-ios-sm text-ios-gray-500">
                {files.length} {files.length === 1 ? 'file' : 'files'} ready to process
              </p>
            </div>
            <button
              onClick={() => setFiles([])}
              className="text-ios-sm text-ios-red font-medium hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-ios-gray-50 rounded-ios hover:bg-ios-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-ios-sm font-medium text-ios-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-ios-xs text-ios-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-ios-gray-400 hover:text-ios-red hover:bg-ios-red/10 rounded-full transition-all group-hover:scale-110"
                  disabled={uploadMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button Below File List */}
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className={cn(
              'mt-6 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm shadow-md transition-all',
              uploadMutation.isPending
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-95'
            )}
          >
            {uploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Submit {files.length} {files.length === 1 ? 'Receipt' : 'Receipts'}</span>
            )}
          </button>
        </div>
      )}

      {/* Success Message */}
      {uploadedCount > 0 && !uploadMutation.isPending && (
        <div className="glass-card border-2 border-ios-green p-6 rounded-ios-lg animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ios-green/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-ios-green" />
            </div>
            <div>
              <p className="text-ios-lg font-semibold text-ios-green">
                Upload Successful!
              </p>
              <p className="text-ios-sm text-ios-gray-600 mt-1">
                Successfully processed {uploadedCount} {uploadedCount === 1 ? 'receipt' : 'receipts'}. 
                View them in your receipts page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      <VerifyOCRModal
        isOpen={verifyModalOpen}
        data={pendingOCRData || {
          storeName: '',
          date: '',
          totalAmount: 0,
          taxAmount: 0,
          items: [],
          ocrStatus: 'pending',
        }}
        onConfirm={handleVerifyOCR}
        onCancel={handleCancelVerify}
        isLoading={verifyMutation.isPending}
      />
    </div>
  );
};