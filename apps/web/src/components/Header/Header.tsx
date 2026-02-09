'use client';

import React, { useState } from 'react';
import './Header.css';

interface HeaderProps {
    className?: string;
}

export const Header: React.FC<HeaderProps> = ({
    className = '',
}) => {
    const [activeTab, setActiveTab] = useState<'intro' | 'guide' | 'rules'>('intro');
    const [showIntroModal, setShowIntroModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const handleTabClick = (tab: 'intro' | 'guide' | 'rules') => {
        setActiveTab(tab);
        if (tab === 'intro') {
            setShowIntroModal(true);
        } else if (tab === 'guide') {
            setShowGuideModal(true);
        } else if (tab === 'rules') {
            setShowRulesModal(true);
        }
    };

    // Get indicator position class based on active tab
    const getIndicatorClass = () => {
        switch (activeTab) {
            case 'intro':
                return 'pos-0';
            case 'guide':
                return 'pos-1';
            case 'rules':
                return 'pos-2';
            default:
                return 'pos-0';
        }
    };

    return (
        <>
            <header className={`header-traditional ${className}`}>
                <nav className={`header-nav-toggle ${getIndicatorClass()}`}>
                    <button
                        className={`header-toggle-btn ${activeTab === 'intro' ? 'active' : ''}`}
                        onClick={() => handleTabClick('intro')}
                    >
                        Giới thiệu
                    </button>
                    <button
                        className={`header-toggle-btn ${activeTab === 'guide' ? 'active' : ''}`}
                        onClick={() => handleTabClick('guide')}
                    >
                        Hướng dẫn
                    </button>
                    <button
                        className={`header-toggle-btn ${activeTab === 'rules' ? 'active' : ''}`}
                        onClick={() => handleTabClick('rules')}
                    >
                        Luật chơi
                    </button>
                </nav>
            </header>

            {/* Intro Modal */}
            {showIntroModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowIntroModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">
                                    🎊 Giới thiệu LÔ TÔ TẾT
                                </h3>
                                <button
                                    onClick={() => setShowIntroModal(false)}
                                    className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div className="text-center mb-4">
                                    <p className="text-lg text-amber-400 font-bold">
                                        🧧 Chào mừng đến với LÔ TÔ TẾT! 🧧
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Lô Tô là gì?</h4>
                                    <p className="leading-relaxed">
                                        Lô Tô là trò chơi truyền thống của người Việt Nam, thường được chơi trong các dịp lễ Tết.
                                        Đây là trò chơi may mắn kết hợp với sự hồi hộp khi chờ đợi số được quay.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Tại sao chọn LÔ TÔ TẾT?</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>🎮 Chơi online cùng bạn bè, gia đình</li>
                                        <li>📱 Giao diện đẹp, dễ sử dụng</li>
                                        <li>🔊 Âm thanh sống động như chơi thật</li>
                                        <li>🏆 Hệ thống cược và thắng thua rõ ràng</li>
                                        <li>🎉 Không giới hạn số người chơi</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Tính năng nổi bật</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Tạo phòng riêng, mời bạn bè qua link</li>
                                        <li>Tự động quay số khi đến lượt</li>
                                        <li>Đánh dấu số nhanh chóng trên vé</li>
                                        <li>Thông báo khi sắp BINGO</li>
                                        <li>Lịch sử các số đã quay</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-amber-200/20">
                                <button
                                    onClick={() => setShowIntroModal(false)}
                                    className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium"
                                >
                                    Bắt đầu chơi ngay! 🎲
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Guide Modal */}
            {showGuideModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowGuideModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">
                                    📖 Hướng dẫn chơi
                                </h3>
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Bước 1: Tạo hoặc vào phòng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li><strong>Tạo phòng:</strong> Nhập tên, số dư và ấn "Tạo phòng mới"</li>
                                        <li><strong>Vào phòng:</strong> Nhập tên, Room ID và số dư rồi ấn "Vào phòng"</li>
                                        <li>Chia sẻ Room ID hoặc link cho bạn bè</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Bước 2: Chuẩn bị chơi</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Xem vé số của bạn (có thể đổi vé bằng nút "Đổi vé")</li>
                                        <li>Khi hài lòng với vé, ấn "Sẵn sàng"</li>
                                        <li>Chủ phòng đặt mức cược và ấn "Bắt đầu" khi tất cả sẵn sàng</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Bước 3: Trong ván chơi</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Chủ phòng ấn nút quay số</li>
                                        <li>Khi số được gọi, nếu vé có số đó → ấn vào ô để đánh dấu</li>
                                        <li>Nếu không có số → hệ thống tự động xử lý</li>
                                        <li>Tiếp tục cho đến khi có người BINGO</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Bước 4: Chiến thắng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Đánh dấu đủ 5 số liên tiếp trên 1 hàng ngang</li>
                                        <li>Ấn nút "BINGO" để xác nhận chiến thắng</li>
                                        <li>Người thắng nhận tiền cược từ tất cả người chơi</li>
                                    </ul>
                                </div>

                                <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-400/30">
                                    <p className="text-amber-400 font-medium text-center">
                                        💡 Mẹo: Theo dõi bảng số đã quay để không bỏ lỡ số nào!
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-amber-200/20">
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium"
                                >
                                    Đã hiểu! 👍
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Rules Modal */}
            {showRulesModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowRulesModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">
                                    📜 Luật chơi LÔ TÔ TẾT
                                </h3>
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Luật phòng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Nút bắt đầu chỉ hiện khi tất cả mọi người trong phòng đã sẵn sàng</li>
                                        <li>Khi có yêu cầu vào phòng mới, nút bắt đầu sẽ ẩn đi</li>
                                        <li>Chủ phòng có quyền duyệt người vào phòng và chỉnh sửa số dư của tất cả người chơi</li>
                                        <li>Chủ phòng có quyền loại người chơi</li>
                                        <li>Chủ phòng có quyền hủy trận ở menu</li>
                                        <li>Người chơi có quyền bỏ cuộc ở menu</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Lưu ý</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Tất cả người chơi phải sẵn sàng trước khi bắt đầu</li>
                                        <li>Cần tối thiểu 2 người để chơi</li>
                                        <li>Sau khi bắt đầu không thể nhận yêu cầu vào phòng</li>
                                        <li>Không thể loại người chơi sau khi bắt đầu</li>
                                        <li>Nếu không chơi tiếp cần ấn nút bỏ cuộc để tiếp tục ván</li>
                                        <li>Nếu người chơi không bỏ cuộc thì không thể tiếp tục trò chơi, chủ phòng hủy trận và bắt đầu ván mới</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Cách chơi</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Mỗi người nhận 1 vé số với các số ngẫu nhiên</li>
                                        <li>Chủ phòng sẽ quay số (từ 1-90)</li>
                                        <li>Khi số được gọi, người chơi đánh dấu ô có số đó trên vé</li>
                                        <li>Nếu vé không có số đó, không cần làm gì</li>
                                        <li>Lượt quay số sẽ tự động sau khi tất cả người chơi đã đánh dấu hoặc không có số</li>
                                        <li>CHIẾN THẮNG khi được 5 số hàng ngang bất kì, ấn nút BINGO để giành chiến thắng</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Tiền cược</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Chủ phòng đặt mức cược cho mỗi ván</li>
                                        <li>Người thắng sẽ nhận tiền cược từ tất cả người chơi khác</li>
                                        <li>Người thua mất số tiền cược đã đặt</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-amber-200/20">
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium"
                                >
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;
