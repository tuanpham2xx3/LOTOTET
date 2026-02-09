'use client';

import React, { useState } from 'react';
import './Footer.css';

interface FooterProps {
    className?: string;
}

type ModalType = 'terms' | 'privacy' | 'cookies' | 'feedback' | 'disclaimer' | null;

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
    const currentYear = new Date().getFullYear();
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Feedback form states
    const [feedbackName, setFeedbackName] = useState('');
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [feedbackType, setFeedbackType] = useState('general');
    const [feedbackText, setFeedbackText] = useState('');
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');

    // Generate random CAPTCHA
    const [captchaNumbers] = useState(() => {
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;
        return { a, b, answer: a + b };
    });

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleFeedbackSubmit = () => {
        setFeedbackError('');

        // Validation
        if (!feedbackName.trim()) {
            setFeedbackError('Vui lòng nhập tên của bạn');
            return;
        }
        if (!feedbackEmail.trim() || !validateEmail(feedbackEmail)) {
            setFeedbackError('Vui lòng nhập email hợp lệ');
            return;
        }
        if (feedbackText.trim().length < 10) {
            setFeedbackError('Nội dung phản hồi cần ít nhất 10 ký tự');
            return;
        }
        if (parseInt(captchaAnswer) !== captchaNumbers.answer) {
            setFeedbackError('Câu trả lời CAPTCHA không đúng');
            return;
        }

        // TODO: Send feedback to server
        console.log('Feedback:', { feedbackName, feedbackEmail, feedbackType, feedbackText });
        setFeedbackSent(true);
        setTimeout(() => {
            setActiveModal(null);
            setFeedbackName('');
            setFeedbackEmail('');
            setFeedbackType('general');
            setFeedbackText('');
            setCaptchaAnswer('');
            setFeedbackSent(false);
        }, 2000);
    };

    const closeModal = () => setActiveModal(null);

    const modalStyle = {
        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
        border: '3px solid #d4a000',
        boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
    };

    return (
        <>
            <footer className={`footer-traditional ${className}`}>
                <nav className="footer-links">
                    <button onClick={() => setActiveModal('terms')} className="footer-link">
                        Điều khoản dịch vụ
                    </button>
                    <span className="footer-divider">|</span>
                    <button onClick={() => setActiveModal('privacy')} className="footer-link">
                        Chính sách bảo mật
                    </button>
                    <span className="footer-divider">|</span>
                    <button onClick={() => setActiveModal('cookies')} className="footer-link">
                        Cookie
                    </button>
                    <span className="footer-divider">|</span>
                    <button onClick={() => setActiveModal('feedback')} className="footer-link">
                        Gửi phản hồi
                    </button>
                    <span className="footer-divider">|</span>
                    <button onClick={() => setActiveModal('disclaimer')} className="footer-link">
                        Miễn trừ trách nhiệm
                    </button>
                </nav>
                <p className="footer-copyright">
                    © {currentYear} LOTOTET. All rights reserved.
                </p>
            </footer>

            {/* Terms Modal */}
            {activeModal === 'terms' && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col" style={modalStyle}>
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">📋 Điều khoản dịch vụ</h3>
                                <button onClick={closeModal} className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">1. Chấp nhận điều khoản</h4>
                                    <p>Bằng việc sử dụng LOTOTET, bạn đồng ý tuân thủ các điều khoản này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">2. Mục đích sử dụng</h4>
                                    <p>LOTOTET được tạo ra với mục đích giải trí trong các dịp lễ Tết. Trò chơi không có giá trị cá cược thật và không khuyến khích cờ bạc.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">3. Tài khoản người dùng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Không yêu cầu đăng ký tài khoản</li>
                                        <li>Dữ liệu phòng chơi được lưu tạm thời</li>
                                        <li>Không lưu trữ thông tin cá nhân</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">4. Quy tắc ứng xử</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Không sử dụng ngôn từ xúc phạm</li>
                                        <li>Tôn trọng người chơi khác</li>
                                        <li>Không gian lận hoặc lợi dụng lỗi hệ thống</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">5. Thay đổi điều khoản</h4>
                                    <p>Chúng tôi có quyền thay đổi điều khoản mà không cần thông báo trước. Vui lòng kiểm tra định kỳ.</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-amber-200/20">
                                <button onClick={closeModal} className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium">
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Privacy Modal */}
            {activeModal === 'privacy' && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col" style={modalStyle}>
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">🔒 Chính sách bảo mật</h3>
                                <button onClick={closeModal} className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Thông tin thu thập</h4>
                                    <p>LOTOTET thu thập tối thiểu thông tin cần thiết:</p>
                                    <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                                        <li>Tên hiển thị (do bạn tự nhập)</li>
                                        <li>ID phiên chơi tạm thời</li>
                                        <li>Thông tin kỹ thuật cơ bản (trình duyệt, thiết bị)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Sử dụng thông tin</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Duy trì kết nối trong phòng chơi</li>
                                        <li>Hiển thị tên người chơi</li>
                                        <li>Cải thiện trải nghiệm người dùng</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Bảo mật dữ liệu</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Kết nối được mã hóa SSL/TLS</li>
                                        <li>Không chia sẻ dữ liệu với bên thứ ba</li>
                                        <li>Dữ liệu phòng chơi tự động xóa sau khi kết thúc</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Quyền của bạn</h4>
                                    <p>Bạn có quyền rời phòng bất cứ lúc nào và dữ liệu của bạn sẽ được xóa ngay lập tức.</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-amber-200/20">
                                <button onClick={closeModal} className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium">
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Cookies Modal */}
            {activeModal === 'cookies' && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col" style={modalStyle}>
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">🍪 Chính sách Cookie</h3>
                                <button onClick={closeModal} className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Cookie là gì?</h4>
                                    <p>Cookie là các tập tin nhỏ được lưu trên thiết bị của bạn để cải thiện trải nghiệm sử dụng.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Cookie chúng tôi sử dụng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li><strong>Cookie phiên:</strong> Duy trì kết nối khi chơi</li>
                                        <li><strong>Cookie lưu trữ:</strong> Ghi nhớ cài đặt âm thanh</li>
                                        <li><strong>Cookie kỹ thuật:</strong> Đảm bảo hoạt động ổn định</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Quản lý Cookie</h4>
                                    <p>Bạn có thể xóa cookie thông qua cài đặt trình duyệt. Lưu ý rằng việc này có thể ảnh hưởng đến trải nghiệm chơi.</p>
                                </div>
                                <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-400/30">
                                    <p className="text-amber-400 font-medium text-center">
                                        ℹ️ LOTOTET không sử dụng cookie quảng cáo hoặc theo dõi
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-amber-200/20">
                                <button onClick={closeModal} className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium">
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Feedback Modal */}
            {activeModal === 'feedback' && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col" style={modalStyle}>
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">💬 Gửi phản hồi</h3>
                                <button onClick={closeModal} className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                {feedbackSent ? (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-4">✅</div>
                                        <p className="text-lg text-amber-400 font-bold">Cảm ơn bạn đã gửi phản hồi!</p>
                                        <p className="text-amber-200/70 mt-2">Chúng tôi sẽ xem xét ý kiến của bạn.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Error message */}
                                        {feedbackError && (
                                            <div className="bg-red-900/30 rounded-lg p-3 border border-red-400/30 text-red-300">
                                                ⚠️ {feedbackError}
                                            </div>
                                        )}

                                        {/* Name field */}
                                        <div>
                                            <label className="block font-bold text-amber-400 mb-2">
                                                👤 Tên của bạn <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={feedbackName}
                                                onChange={(e) => setFeedbackName(e.target.value)}
                                                placeholder="Nhập tên của bạn..."
                                                className="w-full p-3 rounded-lg bg-black/30 border-2 border-amber-200/30 text-amber-200 placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
                                            />
                                        </div>

                                        {/* Email field */}
                                        <div>
                                            <label className="block font-bold text-amber-400 mb-2">
                                                📧 Email <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={feedbackEmail}
                                                onChange={(e) => setFeedbackEmail(e.target.value)}
                                                placeholder="example@email.com"
                                                className="w-full p-3 rounded-lg bg-black/30 border-2 border-amber-200/30 text-amber-200 placeholder-amber-200/40 focus:border-amber-400 focus:outline-none"
                                            />
                                        </div>

                                        {/* Feedback type dropdown */}
                                        <div>
                                            <label className="block font-bold text-amber-400 mb-2">
                                                📝 Loại phản hồi
                                            </label>
                                            <select
                                                value={feedbackType}
                                                onChange={(e) => setFeedbackType(e.target.value)}
                                                className="w-full p-3 rounded-lg bg-black/30 border-2 border-amber-200/30 text-amber-200 focus:border-amber-400 focus:outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="general">💬 Ý kiến chung</option>
                                                <option value="bug">🐛 Báo lỗi</option>
                                                <option value="feature">✨ Đề xuất tính năng</option>
                                                <option value="complaint">😔 Khiếu nại</option>
                                                <option value="other">📋 Khác</option>
                                            </select>
                                        </div>

                                        {/* Content textarea */}
                                        <div>
                                            <label className="block font-bold text-amber-400 mb-2">
                                                💭 Nội dung phản hồi <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="Chia sẻ ý kiến hoặc đề xuất của bạn (tối thiểu 10 ký tự)..."
                                                className="w-full h-28 p-3 rounded-lg bg-black/30 border-2 border-amber-200/30 text-amber-200 placeholder-amber-200/40 focus:border-amber-400 focus:outline-none resize-none"
                                            />
                                            <p className="text-amber-200/50 text-xs mt-1">
                                                {feedbackText.length}/10 ký tự tối thiểu
                                            </p>
                                        </div>

                                        {/* CAPTCHA */}
                                        <div className="bg-amber-900/20 rounded-lg p-4 border-2 border-dashed border-amber-400/40">
                                            <label className="block font-bold text-amber-400 mb-2">
                                                🔒 CAPTCHA: {captchaNumbers.a} + {captchaNumbers.b} = ? <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={captchaAnswer}
                                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                                placeholder="Nhập câu trả lời..."
                                                className="w-full p-3 rounded-lg bg-black/30 border-2 border-amber-200/30 text-amber-200 placeholder-amber-200/40 focus:border-amber-400 focus:outline-none text-center"
                                            />
                                            <p className="text-amber-200/50 text-xs mt-2 text-center">
                                                Giải phương trình này để chứng minh bạn là người dùng thực
                                            </p>
                                        </div>

                                        {/* Contact info */}
                                        <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-400/30 text-center">
                                            <p className="text-amber-400 text-sm">
                                                📧 Trao đổi trực tiếp: <a href="mailto:contact@iceteadev.site" className="text-amber-200 underline hover:text-amber-100 font-medium">contact@iceteadev.site</a>
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {!feedbackSent && (
                                <div className="p-4 border-t border-amber-200/20 flex gap-3">
                                    <button onClick={closeModal} className="flex-1 py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium">
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleFeedbackSubmit}
                                        disabled={!feedbackText.trim()}
                                        className="flex-1 py-3 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Gửi phản hồi
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Disclaimer Modal */}
            {activeModal === 'disclaimer' && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col" style={modalStyle}>
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">⚠️ Miễn trừ trách nhiệm</h3>
                                <button onClick={closeModal} className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-400/30">
                                    <p className="text-amber-400 font-bold text-center">
                                        🎮 LOTOTET là trò chơi giải trí thuần túy
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Mục đích giải trí</h4>
                                    <p>LOTOTET được phát triển hoàn toàn với mục đích giải trí trong các dịp lễ Tết và họp mặt gia đình, bạn bè.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Không khuyến khích cờ bạc</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Tiền trong game là tiền ảo, không có giá trị thực</li>
                                        <li>Không hỗ trợ nạp/rút tiền thật</li>
                                        <li>Không khuyến khích bất kỳ hình thức cá cược nào</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Giới hạn trách nhiệm</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Không chịu trách nhiệm về các thỏa thuận riêng giữa người chơi</li>
                                        <li>Không chịu trách nhiệm về gián đoạn dịch vụ do lỗi kỹ thuật</li>
                                        <li>Người dùng tự chịu trách nhiệm về hành vi của mình</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Độ tuổi sử dụng</h4>
                                    <p>Trò chơi phù hợp với mọi lứa tuổi. Trẻ em nên có sự giám sát của người lớn khi sử dụng.</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-amber-200/20">
                                <button onClick={closeModal} className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium">
                                    Tôi đã đọc và hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Footer;
