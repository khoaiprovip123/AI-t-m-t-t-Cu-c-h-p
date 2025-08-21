
import React from 'react';
import { SparklesIcon, ListIcon, TargetIcon } from './Icons';
import { useTranslation } from '../i18n';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-white border border-slate-200 p-6 rounded-lg text-center flex flex-col items-center">
        <div className="bg-slate-100 p-3 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="font-bold text-lg text-sky-600">{title}</h3>
        <p className="text-slate-600 mt-2 text-sm">{description}</p>
    </div>
);

export const WelcomeScreen: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="text-center p-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">{t('welcomeTitle')}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                {t('welcomeSubtitle')}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <FeatureCard 
                    icon={<SparklesIcon className="w-8 h-8 text-sky-500"/>} 
                    title={t('feature1Title')}
                    description={t('feature1Desc')}
                />
                 <FeatureCard 
                    icon={<ListIcon className="w-8 h-8 text-sky-500"/>} 
                    title={t('feature2Title')}
                    description={t('feature2Desc')}
                />
                 <FeatureCard 
                    icon={<TargetIcon className="w-8 h-8 text-sky-500"/>} 
                    title={t('feature3Title')}
                    description={t('feature3Desc')}
                />
            </div>
        </div>
    );
}
