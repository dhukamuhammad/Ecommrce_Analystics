import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
// Use lucide-react as requested
import { Edit2, Trash2, ChevronDown, Plus, UploadCloud, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { normalizeData } from '../../utils/mapper';

const Upload = () => {
    const navigate = useNavigate();
    // Dynamic State for lists
    const [marketplaces, setMarketplaces] = useState([]);
    const [reportTypes, setReportTypes] = useState([]);
    const [uploads, setUploads] = useState([]); // State for Recent Uploads

    // State for selections
    const [selectedMarketplace, setSelectedMarketplace] = useState(null);
    const [selectedReportType, setSelectedReportType] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // UI States
    const [openDropdown, setOpenDropdown] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // State for Modal
    const [modal, setModal] = useState({
        isOpen: false, type: '', action: 'add', editId: null, inputValue: ''
    });

    // --- 1. FETCH DATA FROM BACKEND ---
    const fetchData = async () => {
        try {
            const [marketRes, reportRes, uploadsRes] = await Promise.all([
                api.get('/getMarketplaces'),
                api.get('/getReportTypes'),
                api.get('/getUploads') // Fetching recent uploads
            ]);
            if (marketRes.data.success) setMarketplaces(marketRes.data.data);
            if (reportRes.data.success) setReportTypes(reportRes.data.data);
            if (uploadsRes.data.success) setUploads(uploadsRes.data.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredReportTypes = reportTypes.filter(
        rt => selectedMarketplace && rt.marketplace_id === selectedMarketplace.id
    );

    // --- 2. HANDLE OUTSIDE CLICK ---
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- 3. MODAL HANDLERS (ADD/EDIT) ---
    const openModal = (type, action, item = null) => {
        setModal({
            isOpen: true, type, action, editId: item ? item.id : null, inputValue: item ? item.name : ''
        });
        setOpenDropdown(null);
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: '', action: 'add', editId: null, inputValue: '' });
    };

    const handleSaveModal = async () => {
        if (!modal.inputValue.trim()) return;
        try {
            if (modal.type === 'marketplace') {
                if (modal.action === 'add') {
                    await api.post('/addMarketplace', { name: modal.inputValue });
                } else {
                    await api.put(`/updateMarketplace/${modal.editId}`, { name: modal.inputValue });
                    if (selectedMarketplace?.id === modal.editId) {
                        setSelectedMarketplace({ ...selectedMarketplace, name: modal.inputValue });
                    }
                }
            } else {
                if (modal.action === 'add') {
                    await api.post('/addReportType', { marketplace_id: selectedMarketplace.id, name: modal.inputValue });
                } else {
                    await api.put(`/updateReportType/${modal.editId}`, { name: modal.inputValue });
                    if (selectedReportType?.id === modal.editId) {
                        setSelectedReportType({ ...selectedReportType, name: modal.inputValue });
                    }
                }
            }
            await fetchData();
            closeModal();
        } catch (error) {
            alert("Something went wrong while saving!");
        }
    };

    // --- 4. DELETE HANDLER FOR LISTS ---
    const handleDelete = async (e, type, id) => {
        e.stopPropagation();
        const isConfirm = window.confirm(`Are you sure you want to delete this ${type}?`);
        if (!isConfirm) return;
        try {
            if (type === 'marketplace') {
                await api.delete(`/deleteMarketplace/${id}`);
                if (selectedMarketplace?.id === id) {
                    setSelectedMarketplace(null); setSelectedReportType(null);
                }
            } else {
                await api.delete(`/deleteReportType/${id}`);
                if (selectedReportType?.id === id) setSelectedReportType(null);
            }
            await fetchData();
        } catch (error) {
            alert("Could not delete. It might be linked to existing data.");
        }
    };

    // --- 5. DELETE UPLOADED FILE ---
    const handleDeleteUpload = async (id) => {
        const isConfirm = window.confirm(`Are you sure you want to delete this uploaded file?`);
        if (!isConfirm) return;
        try {
            await api.delete(`/deleteUpload/${id}`);
            await fetchData(); // Refresh list
        } catch (error) {
            alert("Could not delete file.");
        }
    };

    // --- 6. UPLOAD LOGIC ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile || !selectedMarketplace || !selectedReportType) return;
        setIsUploading(true);

        try {
            // 1. File ko frontend par Read karna (XLSX package use karke)
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Peli sheet ka data nikalna
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

                // 2. Data ko Normalize (Clean) karna apni Mapper file se
                // (Maan lijiye selectedMarketplace.name "Amazon" hai)
                const mappedData = normalizeData(rawJsonData, selectedMarketplace.name);

                // 3. Backend me file save karne ki API call
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('marketplace_id', selectedMarketplace.id);
                formData.append('report_type_id', selectedReportType.id);

                const response = await api.post('/uploadFile', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (response.data.success) {
                    alert('File uploaded successfully!');

                    // 4. Order page par Navigate karna aur mapped data sath bhej dena
                    const isSettlement = selectedReportType.name.toLowerCase().includes('settlement') || selectedReportType.name.toLowerCase().includes('transaction');
                    const reportCategory = isSettlement ? 'settlement' : 'sales';

                    navigate('/order', {
                        state: {
                            previewData: mappedData,
                            uploadId: response.data.data.uploadId,
                            reportCategory: reportCategory // <-- NAYA ADD KIYA
                        }
                    });
                }
                setIsUploading(false);
            };

            // Ye line file ko read karna start karti hai
            reader.readAsArrayBuffer(selectedFile);

        } catch (error) {
            console.error("Upload error:", error);
            alert("Error uploading file!");
            setIsUploading(false);
        }
    };

    return (
        <div className="p-6 flex flex-col  min-w-0 min-h-[calc(100vh-100px)] gap-6">

            {/* --- UPLOAD SECTION CARD --- */}
            <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-8 w-full max-w-[1000px] shadow-sm relative z-0" ref={dropdownRef}>
                <div className="mb-10">
                    <h2 className="font-['Sora',sans-serif] text-[22px] font-bold text-[#243463]">Upload Data Center</h2>
                    <p className="text-[13px] text-[#6B7280] mt-1">Select marketplace, choose report type, and upload your file.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                    {/* Step 1: Marketplace Selector */}
                    <div className="relative w-full">
                        <label className="block text-[13px] font-semibold text-[#111827] mb-2">1. Select Marketplace</label>
                        <div
                            className={`w-full border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-colors ${openDropdown === 'marketplace' ? 'border-[#243463] bg-white shadow-sm' : 'border-[#E5E7EB] bg-[#F8FAFC] hover:border-[#243463]/30'}`}
                            onClick={() => setOpenDropdown(openDropdown === 'marketplace' ? null : 'marketplace')}
                        >
                            <span className={`text-[14px] truncate mr-2 ${selectedMarketplace ? 'text-[#243463] font-medium' : 'text-[#6B7280]'}`}>
                                {selectedMarketplace ? selectedMarketplace.name : 'Choose...'}
                            </span>
                            <ChevronDown size={16} className={`text-[#6B7280] transition-transform duration-200 ${openDropdown === 'marketplace' ? 'rotate-180' : ''}`} />
                        </div>

                        {openDropdown === 'marketplace' && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="max-h-48 overflow-y-auto">
                                    {marketplaces.length === 0 ? (
                                        <div className="px-4 py-3 text-[13px] text-[#6B7280] text-center">No marketplaces found</div>
                                    ) : (
                                        marketplaces.map((mp) => (
                                            <div key={mp.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] border-b border-[#E5E7EB] last:border-0 group">
                                                <span
                                                    className="flex-1 cursor-pointer text-[14px] text-[#243463]"
                                                    onClick={() => { setSelectedMarketplace(mp); setSelectedReportType(null); setOpenDropdown(null); }}
                                                >
                                                    {mp.name}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <Edit2 size={14} className="text-[#6B7280] hover:text-[#243463] cursor-pointer" onClick={(e) => { e.stopPropagation(); openModal('marketplace', 'edit', mp); }} />
                                                    <Trash2 size={14} className="text-[#6B7280] hover:text-[#EF4444] cursor-pointer" onClick={(e) => handleDelete(e, 'marketplace', mp.id)} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div
                                    className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E5E7EB] cursor-pointer hover:bg-[#E5E7EB]/50 transition-colors flex items-center gap-2 text-[#243463] font-semibold text-[13px]"
                                    onClick={() => openModal('marketplace', 'add')}
                                >
                                    <Plus size={16} /> Add Marketplace
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Report Type Selector */}
                    {selectedMarketplace && (
                        <div className="relative w-full animate-in fade-in slide-in-from-left-4 duration-300">
                            <label className="block text-[13px] font-semibold text-[#111827] mb-2">2. Select Report Type</label>
                            <div
                                className={`w-full border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-colors ${openDropdown === 'reportType' ? 'border-[#243463] bg-white shadow-sm' : 'border-[#E5E7EB] bg-[#F8FAFC] hover:border-[#243463]/30'}`}
                                onClick={() => setOpenDropdown(openDropdown === 'reportType' ? null : 'reportType')}
                            >
                                <span className={`text-[14px] truncate mr-2 ${selectedReportType ? 'text-[#243463] font-medium' : 'text-[#6B7280]'}`}>
                                    {selectedReportType ? selectedReportType.name : 'Choose...'}
                                </span>
                                <ChevronDown size={16} className={`text-[#6B7280] transition-transform duration-200 ${openDropdown === 'reportType' ? 'rotate-180' : ''}`} />
                            </div>

                            {openDropdown === 'reportType' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredReportTypes.length === 0 ? (
                                            <div className="px-4 py-3 text-[13px] text-[#6B7280] text-center">No report types found</div>
                                        ) : (
                                            filteredReportTypes.map((rt) => (
                                                <div key={rt.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] border-b border-[#E5E7EB] last:border-0 group">
                                                    <span
                                                        className="flex-1 cursor-pointer text-[14px] text-[#243463]"
                                                        onClick={() => { setSelectedReportType(rt); setOpenDropdown(null); }}
                                                    >
                                                        {rt.name}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <Edit2 size={14} className="text-[#6B7280] hover:text-[#243463] cursor-pointer" onClick={(e) => { e.stopPropagation(); openModal('reportType', 'edit', rt); }} />
                                                        <Trash2 size={14} className="text-[#6B7280] hover:text-[#EF4444] cursor-pointer" onClick={(e) => handleDelete(e, 'reportType', rt.id)} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div
                                        className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E5E7EB] cursor-pointer hover:bg-[#E5E7EB]/50 transition-colors flex items-center gap-2 text-[#243463] font-semibold text-[13px]"
                                        onClick={() => openModal('reportType', 'add')}
                                    >
                                        <Plus size={16} /> Add Report Type
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: File Upload Area */}
                    {/* Step 3: File Upload Area (Compact & Sleek Design) */}
                    {selectedReportType && (
                        <div className="w-full animate-in fade-in slide-in-from-left-4 duration-300 delay-75">
                            <label className="block text-[13px] font-semibold text-[#111827] mb-2">
                                3. Select & Upload
                            </label>

                            <div className={`w-full border rounded-xl p-1.5 flex items-center justify-between transition-colors ${selectedFile ? 'border-[#243463] bg-white shadow-sm' : 'border-[#E5E7EB] bg-[#F8FAFC]'}`}>

                                {/* Left side: File Info */}
                                <div className="flex-1 flex items-center gap-2 px-2 overflow-hidden">
                                    <FileText size={16} className={selectedFile ? "text-[#243463]" : "text-[#9CA3AF]"} />
                                    <span className={`text-[13px] truncate ${selectedFile ? 'text-[#243463] font-medium' : 'text-[#9CA3AF]'}`}>
                                        {selectedFile ? selectedFile.name : 'No file chosen...'}
                                    </span>
                                </div>

                                {/* Right side: Action Buttons */}
                                {!selectedFile ? (
                                    <label className="flex-shrink-0 bg-white border border-[#E5E7EB] text-[#243463] text-[12px] font-semibold px-4 py-2 rounded-[8px] cursor-pointer hover:bg-[#F8FAFC] transition-colors shadow-sm">
                                        Browse
                                        <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
                                    </label>
                                ) : (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {/* Remove File Button */}
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="p-2 w-8 h-8 flex items-center justify-center rounded-[8px] text-[#6B7280] bg-[#F8FAFC] border border-[#E5E7EB] hover:text-[#EF4444] hover:border-[#EF4444] hover:bg-white transition-colors"
                                            title="Remove file"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        {/* Final Upload Button */}
                                        <button
                                            onClick={handleUploadSubmit}
                                            disabled={isUploading}
                                            className="bg-[#243463] text-white text-[12px] font-semibold px-4 py-2 rounded-[8px] cursor-pointer hover:bg-[#1a2548] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                                        >
                                            {isUploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Format info below the box to balance label height */}
                            <p className="text-[10px] text-[#6B7280] mt-1.5 ml-1">Supports CSV, XLSX up to 10MB</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- RECENT UPLOADS SECTION --- */}
            {uploads.length > 0 && (
                <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 w-full max-w-[1000px] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-['Sora',sans-serif] text-[16px] font-bold text-[#243463] mb-4 flex items-center gap-2">
                        <FileText size={18} /> Recent Uploads
                    </h3>

                    <div className="flex flex-col gap-3">
                        {uploads.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white hover:border-[#243463]/30 transition-all group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-[rgba(36,52,99,0.07)] flex items-center justify-center flex-shrink-0">
                                        <FileText size={18} className="text-[#243463]" />
                                    </div>
                                    <div className="min-w-0">
                                        {/* File link (Assumes backend is serving 'uploads' folder statically) */}
                                        <a
                                            href={`/upload/${file.stored_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[14px] font-medium text-[#243463] hover:underline truncate block"
                                        >
                                            {file.stored_file}
                                        </a>
                                        <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[#6B7280]">
                                            <span className="font-semibold text-[#111827]">{file.marketplace_name}</span>
                                            <span>•</span>
                                            <span>{file.report_type_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-4">
                                    <button
                                        onClick={() => handleDeleteUpload(file.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Setup */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="font-['Sora',sans-serif] text-[18px] font-bold text-[#243463] mb-4">
                            {modal.action === 'add' ? 'Add' : 'Edit'} {modal.type === 'marketplace' ? 'Marketplace' : 'Report Type'}
                        </h3>
                        <div className="flex flex-col gap-1.5 mb-6">
                            <label className="text-[12px] font-semibold text-[#111827]">Name</label>
                            <input
                                type="text" value={modal.inputValue}
                                onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                                placeholder={`Enter name...`}
                                className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[14px] text-[#243463] focus:outline-none focus:border-[#243463] bg-[#F8FAFC] focus:bg-white transition-colors"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#E5E7EB] transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleSaveModal} className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] bg-[#243463] text-white shadow-md hover:bg-[#1a2548] transition-colors cursor-pointer">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Upload;