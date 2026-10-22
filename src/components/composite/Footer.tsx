

import React from 'react';


import { Div } from '../basic/Div';
import { A } from '../basic/A';
import { Button } from '../basic/Button';
import { H3 } from '../basic/H3';
import { H4 } from '../basic/H4';
import { P } from '../basic/P';
import { Ul } from '../basic/Ul';
import { Li } from '../basic/Li';
import { Footer as FooterBasic } from '../basic/Footer';
import { Icon } from '../basic/Icon';


const t = (key: string, params?: Record<string, string | number>) =>
  (window as any).G7Core?.t?.(key, params) ?? key;


const navigate = (path: string) => {
  (window as any).G7Core?.dispatch?.({
    handler: 'navigate',
    params: { path },
  });
};

interface SocialLinks {
  github?: string;
  twitter?: string;
  discord?: string;
  facebook?: string;
  instagram?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  
  siteName?: string;
  
  siteDescription?: string;
  
  copyrightText?: string;
  
  socialLinks?: SocialLinks;
  
  linkGroups?: FooterLinkGroup[];
  
  className?: string;
}


const Footer: React.FC<FooterProps> = ({
  siteName = '그누보드7',
  siteDescription,
  copyrightText,
  socialLinks = {},
  linkGroups,
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  
  const defaultLinkGroups: FooterLinkGroup[] = [
    {
      title: t('footer.community'),
      links: [
        { label: t('nav.home'), href: '/' },
        { label: t('nav.popular'), href: '/boards/popular' },
        { label: t('footer.all_boards'), href: '/boards' },
      ],
    },
    {
      title: t('footer.info'),
      links: [
        { label: t('footer.about'), href: '/page/about' },
        { label: t('footer.faq'), href: '/page/faq' },
        { label: t('footer.contact'), href: '/page/contact' },
      ],
    },
    {
      title: t('footer.policy'),
      links: [
        { label: t('footer.terms'), href: '/page/terms' },
        { label: t('footer.privacy'), href: '/page/privacy' },
        { label: t('footer.refund'), href: '/page/refund' },
      ],
    },
  ];

  const groups = linkGroups || defaultLinkGroups;

  
  const socialIconMap: Record<keyof SocialLinks, string> = {
    github: 'github',
    twitter: 'twitter',
    discord: 'discord',
    facebook: 'facebook',
    instagram: 'instagram',
  };

  return (
    <FooterBasic className={`bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 ${className}`}>
      <Div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <Div className="lg:col-span-2">
            <H3 className="text-lg font-bold text-slate-900 dark:text-white">{siteName}</H3>
            {siteDescription && (
              <P className="mt-2 text-sm text-slate-600 dark:text-slate-400">{siteDescription}</P>
            )}

            <Div className="mt-4 flex items-center gap-4">
              {Object.entries(socialLinks).map(([type, url]) =>
                url ? (
                  <A
                    key={type}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    aria-label={type}
                  >
                    <Icon name={socialIconMap[type as keyof SocialLinks]} className="w-5 h-5" />
                  </A>
                ) : null
              )}
            </Div>
          </Div>

          {groups.map((group, index) => (
            <Div key={index}>
              <H4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                {group.title}
              </H4>
              <Ul className="mt-4 space-y-2">
                {group.links.map((link, linkIndex) => (
                  <Li key={linkIndex}>
                    <Button
                      onClick={() => navigate(link.href)}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {link.label}
                    </Button>
                  </Li>
                ))}
              </Ul>
            </Div>
          ))}
        </Div>

        <Div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <P className="text-sm text-slate-500 dark:text-slate-400">
            {copyrightText || `© ${currentYear} ${siteName}. All rights reserved.`}
          </P>
          <P className="text-sm text-slate-500 dark:text-slate-400">
            {t('footer.powered_by')}
          </P>
        </Div>
      </Div>
    </FooterBasic>
  );
};

export default Footer;
