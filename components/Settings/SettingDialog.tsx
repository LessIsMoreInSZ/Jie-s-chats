import { FC, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/settings';

import { DEFAULT_LOCALE, Settings } from '@/types/settings';
import { HomeContext } from '@/pages/home/home';
import { useTheme } from 'next-themes';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const { setTheme } = useTheme();
  const [language, setLanguage] = useState(
    localStorage.getItem('locale') || DEFAULT_LOCALE
  );

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  const handleSave = () => {
    setTheme(state.theme);
    homeDispatch({ field: 'lightMode', value: state.theme });
    saveSettings(state);
  };

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

  // Render the dialog.
  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
      <div className='fixed inset-0 z-10 overflow-hidden'>
        <div className='flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0'>
          <div
            className='hidden sm:inline-block sm:h-screen sm:align-middle'
            aria-hidden='true'
          />

          <div
            ref={modalRef}
            className='dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle'
            role='dialog'
          >
            <div className='text-lg pb-4 font-bold text-black dark:text-neutral-200'>
              {t('Settings')}
            </div>

            {/* <div className='text-sm font-bold mb-2 text-black dark:text-neutral-200'>
              {t('Language')}
            </div>

            <div className='w-full mb-4 focus:outline-none active:outline-none rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white'>
              <select
                className='w-full bg-transparent p-2'
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  localStorage.setItem('locale', event.target.value);
                }}
              >
                <option
                  className='dark:bg-[#343541] dark:text-white'
                  value='zh'
                >
                  {t('Chinese')}
                </option>
                <option
                  className='dark:bg-[#343541] dark:text-white'
                  value='en'
                >
                  {t('English')}
                </option>
              </select>
            </div> */}

            <div className='text-sm font-bold mb-2 text-black dark:text-neutral-200'>
              {t('Theme')}
            </div>

            <div className='w-full focus:outline-none active:outline-none rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white'>
              <select
                className='w-full bg-transparent p-2'
                value={state.theme}
                onChange={(event) =>
                  dispatch({ field: 'theme', value: event.target.value })
                }
              >
                <option
                  className='dark:bg-[#343541] dark:text-white'
                  value='dark'
                >
                  {t('Dark mode')}
                </option>
                <option
                  className='dark:bg-[#343541] dark:text-white'
                  value='light'
                >
                  {t('Light mode')}
                </option>
              </select>
            </div>

            <button
              type='button'
              className='w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300'
              onClick={() => {
                handleSave();
                onClose();
              }}
            >
              {t('Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
