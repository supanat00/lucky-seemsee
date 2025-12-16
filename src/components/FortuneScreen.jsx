import button03 from '../assets/buttons/button03.png'

function FortuneScreen({ headSrc, textSrc, onBack, onConfirm }) {
  return (
    <div className="app-root fortune-root">
      <button className="back-icon" type="button" onClick={onBack} aria-label="Back">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="fortune-container">
        <div className="fortune-head">
          <img src={headSrc} alt="เลขเซียมซี" />
        </div>
        <div className="fortune-text">
          <img src={textSrc} alt="คำทำนาย" />
        </div>
        <div className="fortune-action">
          <button type="button" className="image-button" onClick={() => onConfirm('wallpaper')}>
            <img src={button03} alt="สร้างวอลเปเปอร์มงคล" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FortuneScreen


