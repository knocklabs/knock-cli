/* eslint-disable */

export interface GuideBannerFourStep1Banner001Default {
    body:         string;
    dismissible?: boolean;
    title:        string;
}

export interface GuideBannerOneStep1Banner001Default {
    body:         string;
    dismissible?: boolean;
    title:        string;
}

export interface GuideBannerThreeStep1Banner001Default {
    body:         string;
    dismissible?: boolean;
    title:        string;
}

export interface GuideBannerTwoStep1Banner001Default {
    body:         string;
    dismissible?: boolean;
    title:        string;
}

export interface GuideCardOneStep1Card001Default {
    body:         string;
    dismissible?: boolean;
    headline:     string;
    /**
     * An image to display on the card
     */
    image?: GuideCardOneStep1Card001DefaultImage;
    title:  string;
}

/**
 * An image to display on the card
 */
export interface GuideCardOneStep1Card001DefaultImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideCardTwoStep1Card001SingleAction {
    body:         string;
    dismissible?: boolean;
    headline:     string;
    /**
     * An image to display on the card
     */
    image?:         GuideCardTwoStep1Card001SingleActionImage;
    primary_button: GuideCardTwoStep1Card001SingleActionPrimaryButton;
    title:          string;
}

/**
 * An image to display on the card
 */
export interface GuideCardTwoStep1Card001SingleActionImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideCardTwoStep1Card001SingleActionPrimaryButton {
    action: string;
    text:   string;
}

export interface GuideChangelogCardStep1ChangelogCard001SingleAction {
    body:         string;
    dismissible?: boolean;
    headline:     string;
    /**
     * An image to display on the card
     */
    image?:         GuideChangelogCardStep1ChangelogCard001SingleActionImage;
    primary_button: GuideChangelogCardStep1ChangelogCard001SingleActionPrimaryButton;
    title:          string;
}

/**
 * An image to display on the card
 */
export interface GuideChangelogCardStep1ChangelogCard001SingleActionImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideChangelogCardStep1ChangelogCard001SingleActionPrimaryButton {
    action: string;
    text:   string;
}

export interface GuideModalOneStep1Modal001MultiAction {
    body:         string;
    dismissible?: boolean;
    /**
     * An image to display on the modal
     */
    image?:           GuideModalOneStep1Modal001MultiActionImage;
    primary_button:   GuideModalOneStep1Modal001MultiActionPrimaryButton;
    secondary_button: GuideModalOneStep1Modal001MultiActionPrimaryButton;
    title:            string;
}

/**
 * An image to display on the modal
 */
export interface GuideModalOneStep1Modal001MultiActionImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideModalOneStep1Modal001MultiActionPrimaryButton {
    action: string;
    text:   string;
}

export interface GuideModalThreeStep1Modal001Default {
    body:         string;
    dismissible?: boolean;
    /**
     * An image to display on the modal
     */
    image?: GuideModalThreeStep1Modal001DefaultImage;
    title:  string;
}

/**
 * An image to display on the modal
 */
export interface GuideModalThreeStep1Modal001DefaultImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideModalTwoStep1Modal001MultiAction {
    body:         string;
    dismissible?: boolean;
    /**
     * An image to display on the modal
     */
    image?:           GuideModalTwoStep1Modal001MultiActionImage;
    primary_button:   GuideModalTwoStep1Modal001MultiActionPrimaryButton;
    secondary_button: GuideModalTwoStep1Modal001MultiActionPrimaryButton;
    title:            string;
}

/**
 * An image to display on the modal
 */
export interface GuideModalTwoStep1Modal001MultiActionImage {
    action?: string;
    alt?:    string;
    url:     string;
}

export interface GuideModalTwoStep1Modal001MultiActionPrimaryButton {
    action: string;
    text:   string;
}

type GuideContentTypesByKey = {
  "banner-one": GuideBannerOneStep1Banner001Default;
  "banner-two": GuideBannerTwoStep1Banner001Default;
  "card-one": GuideCardOneStep1Card001Default;
  "card-two": GuideCardTwoStep1Card001SingleAction;
  "changelog-card": GuideChangelogCardStep1ChangelogCard001SingleAction;
  "modal-one": GuideModalOneStep1Modal001MultiAction;
};

type GuideContentTypesByType = {
  "banner": GuideBannerOneStep1Banner001Default | GuideBannerTwoStep1Banner001Default;
  "card": GuideCardOneStep1Card001Default | GuideCardTwoStep1Card001SingleAction;
  "changelog-card": GuideChangelogCardStep1ChangelogCard001SingleAction;
  "modal": GuideModalOneStep1Modal001MultiAction;
};

export type GuideContentTypes = {
  key: GuideContentTypesByKey;
  type: GuideContentTypesByType;
};
