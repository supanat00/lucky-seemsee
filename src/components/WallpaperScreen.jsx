import { useState } from 'react'
import head02 from '../assets/images/head02.png'
import chooseFrame from '../assets/images/choose.png'
import button04 from '../assets/buttons/button04.png'

function WallpaperScreen({
  onBack,
  onCreate,
  topicOptions = [],
  zodiacOptions = [],
  selectedTopic,
  selectedZodiac,
  setSelectedTopic,
  setSelectedZodiac,
}) {
  const [modalOpen, setModalOpen] = useState(null) // 'topic' | 'zodiac' | null

  const getSelectedLabel = (type) => {
    if (type === 'topic') {
      const option = topicOptions.find((opt) => opt.value === selectedTopic)
      return option ? option.label : ''
    }
    if (type === 'zodiac') {
      const option = zodiacOptions.find((opt) => opt.value === selectedZodiac)
      return option ? option.label : ''
    }
    return ''
  }

  const handleSelect = (type, value) => {
    if (type === 'topic') {
      setSelectedTopic(value)
    } else if (type === 'zodiac') {
      setSelectedZodiac(value)
    }
    setModalOpen(null)
  }

  const options = modalOpen === 'topic' ? topicOptions : zodiacOptions

  return (
    <div className="app-root wallpaper-root">
      <button className="back-icon" type="button" onClick={onBack} aria-label="Back">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="wall-container">
        <div className="wall-head">
          <img src={head02} alt="สร้างวอลเปเปอร์มงคล" />
        </div>

        <div className="wall-choose">
          <img src={chooseFrame} alt="" aria-hidden="true" className="choose-frame" />

          <div className="choose-grid">
            <div className="choose-field">
              <div className="select-wrapper">
                <button
                  type="button"
                  className="select-button"
                  onClick={() => setModalOpen('topic')}
                >
                  <span className="select-button-text">
                    {getSelectedLabel('topic') || 'เลือกเสริมดวง'}
                  </span>
                  <svg className="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="choose-field">
              <div className="select-wrapper">
                <button
                  type="button"
                  className="select-button"
                  onClick={() => setModalOpen('zodiac')}
                >
                  <span className="select-button-text">
                    {getSelectedLabel('zodiac') || 'เลือกปีนักษัตร'}
                  </span>
                  <svg className="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="wall-action">
          <button 
            className="image-button" 
            type="button" 
            onClick={onCreate}
            disabled={!selectedTopic || !selectedZodiac}
          >
            <img src={button04} alt="สร้างวอลเปเปอร์มงคล" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="select-modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="select-modal-header">
              <h3 className="select-modal-title">
                {modalOpen === 'topic' ? 'เลือกเสริมดวง' : 'เลือกปีนักษัตร'}
              </h3>
              <button
                type="button"
                className="select-modal-close"
                onClick={() => setModalOpen(null)}
                aria-label="ปิด"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="select-modal-content">
              {options.map((opt) => {
                const isSelected = modalOpen === 'topic' 
                  ? selectedTopic === opt.value 
                  : selectedZodiac === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`select-modal-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(modalOpen, opt.value)}
                  >
                    {opt.label}
                    {isSelected && (
                      <svg className="select-check" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WallpaperScreen


