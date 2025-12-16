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
                <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
                  <option value=""></option>
                  {topicOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="choose-field">
              <div className="select-wrapper">
                <select value={selectedZodiac} onChange={(e) => setSelectedZodiac(e.target.value)}>
                  <option value=""></option>
                  {zodiacOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="wall-action">
          <button className="image-button" type="button" onClick={onCreate}>
            <img src={button04} alt="สร้างวอลเปเปอร์มงคล" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default WallpaperScreen


